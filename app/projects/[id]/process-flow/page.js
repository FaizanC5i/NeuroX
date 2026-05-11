"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function ProcessFlowPage() {
  const { id: projectId } = useParams();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f0f0f5]">
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Define Phase</p>
          <h1 className="text-xl font-semibold text-gray-900 mt-0.5">Process Flow</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
          <p className="text-lg font-medium text-gray-700">work in progreess</p>
        </div>
      </div>
    </div>
  );
}
