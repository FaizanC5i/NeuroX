"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* ===========================
   SAFE PARSER (UPDATED)
=========================== */
function parsePersonaOutput(rawOutput, fallbackName) {
  const normalized = String(rawOutput || "").replace(/\r\n/g, "\n").trim();

  const getHeadingBlock = (text, heading) => {
    const regex = new RegExp(
      `${heading}:?\\s*([\\s\\S]*?)(?=\\n[A-Z][a-zA-Z ]+:|$)`,
      "i"
    );
    return text.match(regex)?.[1]?.trim() || "";
  };

  const getBullets = (block) => {
    if (!block) return [];
    return block
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  };

  return {
  name: fallbackName || "Persona",
  says: getBullets(getHeadingBlock(normalized, "Says")),
  thinks: getBullets(getHeadingBlock(normalized, "Thinks")),
  does: getBullets(getHeadingBlock(normalized, "Does")),
  feels: getBullets(getHeadingBlock(normalized, "Feels")),
  painPoints: getBullets(getHeadingBlock(normalized, "Pain Points")),
  needs: getBullets(getHeadingBlock(normalized, "Needs")),
};
}

function buildPersonaOutput(data) {
  return `Says:
${(data.says || []).map((x) => `- ${x}`).join("\n")}

Thinks:
${(data.thinks || []).map((x) => `- ${x}`).join("\n")}

Does:
${(data.does || []).map((x) => `- ${x}`).join("\n")}

Feels:
${(data.feels || []).map((x) => `- ${x}`).join("\n")}

Pain Points:
${(data.painPoints || []).map((x) => `- ${x}`).join("\n")}

Needs:
${(data.needs || []).map((x) => `- ${x}`).join("\n")}`;
}

export default function ViewPersonaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = searchParams.get("projectId") || "";
  const projectName = searchParams.get("projectName") || "";

  const [personaGroups, setPersonaGroups] = useState([]);
  const [activePersonaId, setActivePersonaId] = useState(null);
  const [activeIntervieweeId, setActiveIntervieweeId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [personaDescription, setPersonaDescription] = useState("");
  const [summary, setSummary] = useState("");
const [loadingSummary, setLoadingSummary] = useState(false);
const [insights, setInsights] = useState([]);
const [isEditing, setIsEditing] = useState(false);
const [editableData, setEditableData] = useState(null);
const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(
        `/api/personas?projectId=${projectId}&includeGenerated=true&groupByInterviewee=true`
      );
      const data = await res.json();

      const map = new Map();

      for (const row of data.data || []) {
        if (!map.has(row.persona_id)) {
          map.set(row.persona_id, {
            personaId: row.persona_id,
            personaName: row.persona_name,
            interviewees: [],
          });
        }

        map.get(row.persona_id).interviewees.push({
          interviewId: row.interview_id,
          intervieweeId: row.interviewee_id,
          intervieweeName: row.interviewee_name,
          parsed: parsePersonaOutput(
            row.generated_output,
            row.interviewee_name
          ),
        });
      }

      const groups = Array.from(map.values());
      setPersonaGroups(groups);

      setActivePersonaId(groups[0]?.personaId);
      setActiveIntervieweeId(groups[0]?.interviewees?.[0]?.intervieweeId);

      setIsLoading(false);
    };

    fetchData();
  }, [projectId]);

  const activePersonaGroup = useMemo(
    
    () => personaGroups.find((g) => g.personaId === activePersonaId),
    [personaGroups, activePersonaId]
  );
  

  const activeInterviewee = useMemo(
    () =>
      activePersonaGroup?.interviewees?.find(
        (i) => i.intervieweeId === activeIntervieweeId
      ),
    [activePersonaGroup, activeIntervieweeId]
  );
  useEffect(() => {
  const fetchSummary = async () => {
    if (!activeInterviewee) return;

    setLoadingSummary(true);

    try {
      const res = await fetch("/api/description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_description: projectName,
          persona_title: activeInterviewee.intervieweeName,
          user_answers: [
    ...activeInterviewee.parsed.says,
    ...activeInterviewee.parsed.thinks,
    ...activeInterviewee.parsed.does,
    ...activeInterviewee.parsed.feels,
  ].join("\n"),
        }),
      });

      const data = await res.json();
      let cleanText = data.summary || "";

// remove JSON wrapper if present
if (cleanText.includes("summary_output")) {
  try {
    const parsed = JSON.parse(cleanText);
    cleanText = parsed.summary_output || cleanText;
  } catch {}
}

// convert \n → real line breaks
cleanText = cleanText.replace(/\\n/g, "\n");

// 🔥 SPLIT SUMMARY & INSIGHTS
let summaryPart = "";
let insightsPart = [];

const parts = cleanText.split(/Key Insights:/i);

summaryPart = parts[0]?.replace(/User Summary:/i, "").trim();

if (parts[1]) {
  insightsPart = parts[1]
    .split("\n")
    .map((l) => l.replace(/^[-•*\d.\s]+/, "").trim())
    .filter(Boolean);
}

setSummary(summaryPart);
setInsights(insightsPart);
    } catch (err) {
      setSummary("Failed to load summary");
    }

    setLoadingSummary(false);
  };

  fetchSummary();
}, [activeInterviewee]); // ✅ key fix

  const safeList = (arr) => (Array.isArray(arr) && arr.length ? arr : ["No data"]);

  useEffect(() => {
    if (!activeInterviewee?.parsed) return;

    const normalizeEditable = (arr) => (Array.isArray(arr) && arr.length ? [...arr] : [""]);

    setEditableData({
      says: normalizeEditable(activeInterviewee.parsed.says),
      thinks: normalizeEditable(activeInterviewee.parsed.thinks),
      does: normalizeEditable(activeInterviewee.parsed.does),
      feels: normalizeEditable(activeInterviewee.parsed.feels),
      painPoints: normalizeEditable(activeInterviewee.parsed.painPoints),
      needs: normalizeEditable(activeInterviewee.parsed.needs),
    });
    setIsEditing(false);
  }, [activeInterviewee]);

  const maxRows = Math.max(
    editableData?.says?.length || 0,
    editableData?.thinks?.length || 0,
    editableData?.does?.length || 0,
    editableData?.feels?.length || 0,
    1
  );

  return (
    <div className="page">
      <h1 className="page-title">{projectName || "User Persona"}</h1>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="content">
          <div className="tabs">
             
  {personaGroups.map((p) => (
    <button
      key={p.personaId}
      className={activePersonaId === p.personaId ? "tab active" : "tab"}
      onClick={() => {
        setActivePersonaId(p.personaId);
        setActiveIntervieweeId(p.interviewees[0]?.intervieweeId);
      }}
    >
      {p.personaName}
    </button>
  ))}
</div>

          {/* Interviewee Tabs */}
         <div className="tabs">
          
  {activePersonaGroup?.interviewees?.map((i) => (
    <button
      key={i.intervieweeId}
      className={activeIntervieweeId === i.intervieweeId ? "tab active" : "tab"}
      onClick={() => setActiveIntervieweeId(i.intervieweeId)}
    >
      {i.intervieweeName}
      
    </button>
    
    
  ))}
</div>


        <div className="summary-box">
  {loadingSummary ? (
    <p>Loading summary...</p>
  ) : (
    <p>{summary}</p>
  )}
</div>
  

          {/* EMPATHY MAP TABLE */}
          {activeInterviewee && (
            <>
              <div className="empathy-actions">
                <button
                  className="action-btn secondary"
                  onClick={() => setIsEditing((prev) => !prev)}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>

                {isEditing && (
                  <>
                    <button
                      className="action-btn slate"
                      onClick={() => {
                        setEditableData((prev) => ({
                          says: [...(prev?.says || []), ""],
                          thinks: [...(prev?.thinks || []), ""],
                          does: [...(prev?.does || []), ""],
                          feels: [...(prev?.feels || []), ""],
                          painPoints: [...(prev?.painPoints || []), ""],
                          needs: [...(prev?.needs || []), ""],
                        }));
                      }}
                    >
                      Add Row
                    </button>
                    <button
                      className="action-btn success"
                      disabled={isSaving || !activeInterviewee?.interviewId}
                      onClick={async () => {
                        if (!activeInterviewee?.interviewId) {
                          alert("No interview found for this persona entry.");
                          return;
                        }

                        try {
                          setIsSaving(true);
                          const personaOutput = buildPersonaOutput(editableData || {});

                          const res = await fetch("/api/update-persona-output", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              interviewId: activeInterviewee.interviewId,
                              personaOutput,
                            }),
                          });

                          const payload = await res.json();

                          if (!res.ok || !payload?.success) {
                            alert(payload?.error?.message || "Save failed");
                            return;
                          }

                          alert("Saved successfully");
                          setIsEditing(false);
                          window.location.reload();
                        } catch {
                          alert("Something went wrong while saving");
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
              </div>

              <div className="summary-box empathy-shell">
                <h3 className="empathy-heading">Empathy Map</h3>

                <div className="table-wrap">
                  <table className="empathy-table">
                    <thead>
                      <tr>
                        <th className="dark-col">Says</th>
                        <th className="grey-col">Thinks</th>
                        <th className="dark-col">Does</th>
                        <th className="grey-col">Feels</th>
                      </tr>
                    </thead>

                    <tbody>
                      {Array.from({ length: maxRows }).map((_, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={rowIndex % 2 === 0 ? "light-row" : "white-row"}
                        >
                          <td>
                            {isEditing ? (
                              <textarea
                                value={editableData?.says?.[rowIndex] || ""}
                                onChange={(e) => {
                                  setEditableData((prev) => {
                                    const next = { ...(prev || {}) };
                                    next.says = [...(prev?.says || [])];
                                    next.says[rowIndex] = e.target.value;
                                    return next;
                                  });
                                }}
                                className="cell-input"
                              />
                            ) : (
                              editableData?.says?.[rowIndex] || "No data"
                            )}
                          </td>

                          <td>
                            {isEditing ? (
                              <textarea
                                value={editableData?.thinks?.[rowIndex] || ""}
                                onChange={(e) => {
                                  setEditableData((prev) => {
                                    const next = { ...(prev || {}) };
                                    next.thinks = [...(prev?.thinks || [])];
                                    next.thinks[rowIndex] = e.target.value;
                                    return next;
                                  });
                                }}
                                className="cell-input"
                              />
                            ) : (
                              editableData?.thinks?.[rowIndex] || "No data"
                            )}
                          </td>

                          <td>
                            {isEditing ? (
                              <textarea
                                value={editableData?.does?.[rowIndex] || ""}
                                onChange={(e) => {
                                  setEditableData((prev) => {
                                    const next = { ...(prev || {}) };
                                    next.does = [...(prev?.does || [])];
                                    next.does[rowIndex] = e.target.value;
                                    return next;
                                  });
                                }}
                                className="cell-input"
                              />
                            ) : (
                              editableData?.does?.[rowIndex] || "No data"
                            )}
                          </td>

                          <td>
                            {isEditing ? (
                              <textarea
                                value={editableData?.feels?.[rowIndex] || ""}
                                onChange={(e) => {
                                  setEditableData((prev) => {
                                    const next = { ...(prev || {}) };
                                    next.feels = [...(prev?.feels || [])];
                                    next.feels[rowIndex] = e.target.value;
                                    return next;
                                  });
                                }}
                                className="cell-input"
                              />
                            ) : (
                              editableData?.feels?.[rowIndex] || "No data"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}
        </div>
      )}{/* PAIN POINTS */}
{activeInterviewee && (
  <div className="summary-box">
    <h3>Pain Points</h3>

    {safeList(editableData?.painPoints).length > 0 ? (
      safeList(editableData?.painPoints).map((item, i) => (
        <p key={i}>• {item}</p>
      ))
    ) : (
      <p>No pain points available</p>
    )}
  </div>
)}

{/* NEEDS */}
{activeInterviewee && (
  <div className="summary-box">
    <h3>Needs</h3>

    {safeList(editableData?.needs).length > 0 ? (
      safeList(editableData?.needs).map((item, i) => (
        <p key={i}>• {item}</p>
      ))
    ) : (
      <p>No needs available</p>
    )}
  </div>
)}
      {insights.length > 0 && (
  <div className="summary-box">
    <h3>Key Insights</h3>

    {insights.map((item, i) => (
      <p key={i}>• {item}</p>
    ))}
  </div>
)}
      <style jsx>{`

      .page-title {
  font-size: 28px;      /* 🔥 bigger heading */
  font-weight: 700;
  margin-bottom: 20px;
}

.page {
  padding: 10px 10px;   /* 🔥 space under heading */
}
  
      .tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 5px;
}

.tab {
  padding: 8px 16px;
  border: none;
  background: #f3f4f6;
  color: #374151;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.summary-box {
  margin-top: 12px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #d8e0ea;
  border-radius: 12px;
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
  box-shadow: 0 8px 26px rgba(15, 23, 42, 0.06);
}

/* Hover */
.tab:hover {
  background: #e5e7eb;
}

/* Active tab (VIOLET THEME) */
.tab.active {
  background: linear-gradient(135deg, #1e3a8a, #2563eb);
  color: white;
  font-weight: 600;
  box-shadow: 0 -2px 6px rgba(0,0,0,0.1);
}

.empathy-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.action-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  color: #ffffff;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.action-btn.secondary {
  background: linear-gradient(135deg, #1e3a8a, #2563eb);
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.28);
}

.action-btn.slate {
  background: linear-gradient(135deg, #111827, #374151);
  box-shadow: 0 10px 22px rgba(17, 24, 39, 0.28);
}

.action-btn.success {
  background: linear-gradient(135deg, #166534, #16a34a);
  box-shadow: 0 10px 22px rgba(22, 163, 74, 0.28);
}

.empathy-shell {
  margin-top: 12px;
}

.empathy-heading {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.2px;
  color: #111827;
}

.table-wrap {
  overflow-x: auto;
}

.empathy-table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: 12px;
  font-size: 14px;
  border: 1px solid #dbe3ee;
}

.empathy-table th {
  padding: 14px;
  color: #ffffff;
  text-align: left;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.dark-col {
  background: #0f172a;
}

.grey-col {
  background: #334155;
}

.empathy-table td {
  padding: 14px;
  border: 1px solid #e5e7eb;
  vertical-align: top;
  color: #1f2937;
  min-width: 220px;
}

.light-row {
  background: #f8fbff;
}

.white-row {
  background: #ffffff;
}

.empathy-table tr:hover td {
  background: #eff6ff;
  transition: background 0.2s ease;
}

.cell-input {
  width: 100%;
  min-height: 90px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  color: #0f172a;
  background: #ffffff;
}

.cell-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

@media (max-width: 900px) {
  .empathy-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
      `}</style>
    </div>
  );
}

