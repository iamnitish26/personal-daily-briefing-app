"use client";

import { useState } from "react";
import type { CertificationByte } from "@/lib/types";

function answerLetter(choice: string, index: number): string {
  const match = choice.match(/^([A-D])[\).:-]\s*/i);
  return (match?.[1] ?? String.fromCharCode(65 + index)).toUpperCase();
}

function choiceText(choice: string): string {
  return choice.replace(/^[A-D][\).:-]\s*/i, "");
}

export function CertificationByteCard({ byte }: { byte: CertificationByte }) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const correctAnswer = byte.answer.trim().toUpperCase().slice(0, 1);

  return (
    <section className="mt-8 min-w-0 overflow-hidden rounded-lg border border-fern/20 bg-fern p-4 text-white shadow-soft dark:border-emerald-300/20 dark:bg-emerald-950/80 sm:p-6">
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
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 text-sm text-white/90 sm:grid-cols-2">
          {byte.choices.map((choice, index) => {
            const letter = answerLetter(choice, index);
            const isSelected = selectedAnswer === letter;
            const isCorrect = correctAnswer === letter;
            const resultClass = selectedAnswer
              ? isCorrect
                ? "border-emerald-200 bg-emerald-200 text-emerald-950"
                : isSelected
                  ? "border-red-200 bg-red-100 text-red-950"
                  : "border-white/10 bg-white/10 text-white/80"
              : isSelected
                ? "border-white bg-white text-fern"
                : "border-white/10 bg-white/10 text-white/90 hover:border-white/50";

            return (
              <button
                key={choice}
                type="button"
                onClick={() => setSelectedAnswer(letter)}
                className={`flex min-w-0 items-start gap-2 rounded-md border px-3 py-2 text-left transition ${resultClass}`}
            >
                <span className="shrink-0 font-black">{letter}.</span>
                <span className="[overflow-wrap:anywhere]">{choiceText(choice)}</span>
              </button>
            );
          })}
        </div>
        {selectedAnswer ? (
          <p className="mt-4 [overflow-wrap:anywhere] text-sm leading-6 text-white/90">
            <span className="font-semibold">Answer: {byte.answer}. </span>
            {byte.answer_explanation}
          </p>
        ) : null}
      </div>
    </section>
  );
}
