'use client';

import { useState, useEffect, useCallback } from 'react';
import { Joyride, STATUS, EVENTS } from 'react-joyride';
import type { Step, EventData } from 'react-joyride';
import type { Controls } from 'react-joyride';

const TOUR_STORAGE_KEY = 'openagentx_tour_completed_v1';
const TOUR_STEPS_CACHE_KEY = 'openagentx_tour_steps_cache';
const TOUR_STEPS_CACHE_TTL = 3600 * 1000; // 1 hour
const TOUR_STEPS_API = 'https://server-main.starian.us/api/tour-steps/openagentx/public';

const FALLBACK_STEPS: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Welcome to OpenAgentX</h3>
        <p style={{ color: '#666', lineHeight: 1.6 }}>
          Discover AI agents built for every task. Let us show you around.
        </p>
      </div>
    ),
    placement: 'center',
    skipBeacon: true,
  },
  {
    target: 'nav a[href*="/agents"]',
    content: (
      <div>
        <h3 style={{ marginBottom: 8, fontWeight: 700 }}>Browse Agents</h3>
        <p style={{ color: '#666', lineHeight: 1.6 }}>
          Explore our marketplace of specialized AI agents — from coding to data analysis and more.
        </p>
      </div>
    ),
    placement: 'bottom',
    skipBeacon: true,
    targetWaitTimeout: 2000,
  },
  {
    target: 'a[href="/chat"]',
    content: (
      <div>
        <h3 style={{ marginBottom: 8, fontWeight: 700 }}>AI Chat</h3>
        <p style={{ color: '#666', lineHeight: 1.6 }}>
          Start a conversation with our AI concierge. It will match you with the right agent automatically.
        </p>
      </div>
    ),
    placement: 'bottom',
    skipBeacon: true,
    targetWaitTimeout: 2000,
  },
  {
    target: 'input[type="search"], input[placeholder*="Search" i]',
    content: (
      <div>
        <h3 style={{ marginBottom: 8, fontWeight: 700 }}>Search Agents</h3>
        <p style={{ color: '#666', lineHeight: 1.6 }}>
          Type a task or keyword to instantly find the best agent for your needs.
        </p>
      </div>
    ),
    placement: 'bottom',
    skipBeacon: true,
    targetWaitTimeout: 2000,
  },
  {
    target: 'a[href*="/agents/register"]',
    content: (
      <div>
        <h3 style={{ marginBottom: 8, fontWeight: 700 }}>Register Your Agent</h3>
        <p style={{ color: '#666', lineHeight: 1.6 }}>
          Have an AI agent? List it on our marketplace and start earning from every task it completes.
        </p>
      </div>
    ),
    placement: 'bottom',
    skipBeacon: true,
    targetWaitTimeout: 2000,
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>You are all set!</h3>
        <p style={{ color: '#666', lineHeight: 1.6 }}>
          Explore agents, chat with AI, or register your own. OpenAgentX is ready for you.
        </p>
      </div>
    ),
    placement: 'center',
    skipBeacon: true,
  },
];

function apiStepsToJoyride(apiSteps: Array<{ target: string; title: string; content: string; placement: string }>): Step[] {
  return apiSteps.map((s) => ({
    target: s.target,
    title: s.title,
    content: s.content,
    placement: (s.placement || 'bottom') as Step['placement'],
    skipBeacon: true,
    targetWaitTimeout: 2000,
  }));
}

async function fetchTourSteps(): Promise<Step[]> {
  try {
    const cached = localStorage.getItem(TOUR_STEPS_CACHE_KEY);
    if (cached) {
      const { steps, ts } = JSON.parse(cached);
      if (Date.now() - ts < TOUR_STEPS_CACHE_TTL) return apiStepsToJoyride(steps);
    }
  } catch {}
  try {
    const res = await fetch(TOUR_STEPS_API, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        try { localStorage.setItem(TOUR_STEPS_CACHE_KEY, JSON.stringify({ steps: data.steps, ts: Date.now() })); } catch {}
        return apiStepsToJoyride(data.steps);
      }
    }
  } catch {}
  return FALLBACK_STEPS;
}

export function TourProvider() {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>(FALLBACK_STEPS);

  useEffect(() => {
    // SSR 방지: 클라이언트에서만 localStorage 접근
    let timer: ReturnType<typeof setTimeout>;
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed) {
        fetchTourSteps().then((s) => setSteps(s)).catch(() => {});
        timer = setTimeout(() => setRun(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage 접근 불가 환경 (ex: Safari private mode) — 무시
    }
  }, []);

  const handleEvent = useCallback((data: EventData, _controls: Controls) => {
    const { status, type } = data;

    if (
      type === EVENTS.TOUR_END ||
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED
    ) {
      setRun(false);
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      } catch {
        // localStorage 쓰기 실패 — 무시
      }
    }
  }, []);

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleEvent}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        open: 'Open the dialog',
        skip: 'Skip',
      }}
      options={{
        showProgress: true,
        buttons: ['back', 'close', 'primary', 'skip'],
        zIndex: 10000,
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        primaryColor: '#000000',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        width: 360,
        spotlightRadius: 8,
        offset: 12,
      }}
      styles={{
        tooltip: {
          borderRadius: 12,
          padding: '20px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonPrimary: {
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          padding: '8px 20px',
        },
        buttonBack: {
          borderRadius: 8,
          fontSize: 14,
          marginRight: 8,
        },
        buttonSkip: {
          fontSize: 13,
          color: '#999',
        },
        buttonClose: {
          top: 12,
          right: 12,
        },
      }}
    />
  );
}
