import type { CertificationByte } from "@/lib/types";

export function CertificationByteCard({ byte }: { byte: CertificationByte }) {
  return (
    <section className="mt-8 rounded-lg border border-fern/20 bg-fern p-6 text-white shadow-soft">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-white/70">
        Databricks Certification Byte / {byte.level}
      </div>
      <h2 className="text-2xl font-bold">{byte.title}</h2>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/70">
            Concept
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/90">{byte.concept}</p>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/70">
            Exam Relevance
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/90">{byte.exam_relevance}</p>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/70">
            Example
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/90">{byte.example}</p>
        </div>
      </div>
      <div className="mt-6 rounded-md bg-white/10 p-4">
        <h3 className="font-semibold">Practice Question</h3>
        <p className="mt-2 text-sm leading-6 text-white/90">{byte.question}</p>
        <ul className="mt-3 grid gap-2 text-sm text-white/90 sm:grid-cols-2">
          {byte.choices.map((choice) => (
            <li key={choice} className="rounded-md bg-white/10 px-3 py-2">
              {choice}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-6 text-white/90">
          <span className="font-semibold">Answer: {byte.answer}. </span>
          {byte.answer_explanation}
        </p>
      </div>
    </section>
  );
}
