import type { CertificationByte } from "@/lib/types";

export function CertificationByteCard({ byte }: { byte: CertificationByte }) {
  return (
    <section className="mt-8 min-w-0 overflow-hidden rounded-lg border border-fern/20 bg-fern p-4 text-white shadow-soft sm:p-6">
      <div className="mb-2 min-w-0 text-xs font-bold uppercase tracking-[0.1em] text-white/70 sm:tracking-[0.16em]">
        Databricks Certification Byte / {byte.level}
      </div>
      <h2 className="min-w-0 [overflow-wrap:anywhere] text-2xl font-bold">
        {byte.title}
      </h2>
      <div className="mt-5 grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/70">
            Concept
          </h3>
          <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-white/90">
            {byte.concept}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/70">
            Exam Relevance
          </h3>
          <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-white/90">
            {byte.exam_relevance}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/70">
            Example
          </h3>
          <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-white/90">
            {byte.example}
          </p>
        </div>
      </div>
      <div className="mt-6 min-w-0 rounded-md bg-white/10 p-3 sm:p-4">
        <h3 className="font-semibold">Practice Question</h3>
        <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-white/90">
          {byte.question}
        </p>
        <ul className="mt-3 grid min-w-0 grid-cols-1 gap-2 text-sm text-white/90 sm:grid-cols-2">
          {byte.choices.map((choice) => (
            <li
              key={choice}
              className="min-w-0 [overflow-wrap:anywhere] rounded-md bg-white/10 px-3 py-2"
            >
              {choice}
            </li>
          ))}
        </ul>
        <p className="mt-4 [overflow-wrap:anywhere] text-sm leading-6 text-white/90">
          <span className="font-semibold">Answer: {byte.answer}. </span>
          {byte.answer_explanation}
        </p>
      </div>
    </section>
  );
}
