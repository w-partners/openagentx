'use client';

import { useState } from 'react';
import { useDict } from '@/i18n/client';

interface RatingButtonsProps {
  agentId?: string;
  jobId?: string;
  fulfillQuery?: string;
  responseProvider?: string;
  responseCategory?: string;
  promptId?: string;
  mode?: 'stars' | 'thumbs';
  onRated?: (rating: number) => void;
}

export default function RatingButtons({
  agentId,
  jobId,
  fulfillQuery,
  responseProvider,
  responseCategory,
  promptId,
  mode = 'stars',
  onRated,
}: RatingButtonsProps) {
  const dict = useDict();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleRate(rating: number) {
    if (submitted || submitting) return;

    setSelectedRating(rating);
    setSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          jobId,
          fulfillQuery,
          rating,
          responseProvider,
          responseCategory,
          promptId,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        onRated?.(rating);
      }
    } catch {
      // allow retry on failure
      setSelectedRating(null);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-green-600 dark:text-green-400">
          {dict.feedbackWidget.submitted}
        </span>
      </div>
    );
  }

  if (mode === 'thumbs') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{dict.feedbackWidget.helpfulQuestion}</span>
        <button
          onClick={() => handleRate(5)}
          disabled={submitting}
          className={`rounded-md px-2 py-1 text-sm transition-colors
            ${selectedRating === 5
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'hover:bg-green-50 dark:hover:bg-green-950'
            } disabled:opacity-50`}
          title="Helpful"
        >
          Like
        </button>
        <button
          onClick={() => handleRate(1)}
          disabled={submitting}
          className={`rounded-md px-2 py-1 text-sm transition-colors
            ${selectedRating === 1
              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              : 'hover:bg-red-50 dark:hover:bg-red-950'
            } disabled:opacity-50`}
          title="Not helpful"
        >
          Dislike
        </button>
      </div>
    );
  }

  // star rating mode
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{dict.feedbackWidget.ratingLabel}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = (hoveredRating ?? selectedRating ?? 0) >= star;
          return (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(null)}
              disabled={submitting}
              className={`text-lg transition-colors disabled:opacity-50
                ${isActive
                  ? 'text-yellow-500'
                  : 'text-gray-300 dark:text-gray-600'
                } hover:scale-110`}
              title={`${star} stars`}
            >
              ★
            </button>
          );
        })}
      </div>
      {submitting && <span className="text-xs text-muted-foreground">{dict.feedbackWidget.submitting}</span>}
    </div>
  );
}
