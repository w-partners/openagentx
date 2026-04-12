'use client';

import { detectClientLocale } from '@/i18n/client';

export default function TermsPage() {
  const locale = detectClientLocale();
  const isKo = locale === 'ko';

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">
        {isKo ? '이용약관' : 'Terms of Service'}
      </h1>
      <p className="text-sm text-muted-foreground">
        {isKo ? '최종 수정일: 2026년 3월 31일' : 'Last updated: March 31, 2026'}
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '1. 서비스 개요' : '1. Service Overview'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? 'OpenAgentX는 AI 에이전트 마켓플레이스입니다. 다양한 AI 에이전트를 탐색하고, 이용하고, 등록할 수 있는 플랫폼을 제공합니다.'
            : 'OpenAgentX is an AI agent marketplace. We provide a platform where you can explore, use, and register various AI agents.'}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '2. 이용자 자격' : '2. User Eligibility'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? '만 14세 이상이면 누구나 서비스를 이용할 수 있습니다. 서비스 이용을 위해 회원가입이 필요합니다.'
            : 'Anyone aged 14 or older may use the service. Registration is required to use the service.'}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '3. 서비스 이용' : '3. Service Usage'}
        </h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed space-y-2">
          <li>
            {isKo
              ? '에이전트 서비스는 건당 과금(pay-per-use) 방식으로 제공됩니다.'
              : 'Agent services are provided on a pay-per-use basis.'}
          </li>
          <li>
            {isKo
              ? '포인트 또는 USD로 결제할 수 있습니다.'
              : 'Payments can be made with points or USD.'}
          </li>
          <li>
            {isKo
              ? '에스크로 시스템으로 결제가 보호됩니다.'
              : 'Payments are protected by an escrow system.'}
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '4. 에이전트 등록' : '4. Agent Registration'}
        </h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed space-y-2">
          <li>
            {isKo
              ? '누구나 에이전트를 등록할 수 있습니다.'
              : 'Anyone can register an agent.'}
          </li>
          <li>
            {isKo
              ? '관리자 검토 후 승인됩니다.'
              : 'Agents are approved after admin review.'}
          </li>
          <li>
            {isKo
              ? '노출 수수료는 자발적으로 설정하며, 플랫폼 판매 수수료는 없습니다.'
              : 'Exposure fees are set voluntarily. There is no platform sales commission.'}
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '5. 금지 행위' : '5. Prohibited Activities'}
        </h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed space-y-2">
          <li>
            {isKo
              ? '불법 서비스 등록 및 이용'
              : 'Registering or using illegal services'}
          </li>
          <li>
            {isKo
              ? '타인의 지적재산권 침해'
              : 'Infringing on others\' intellectual property rights'}
          </li>
          <li>
            {isKo
              ? '시스템 악용 및 부정 결제'
              : 'System abuse and fraudulent payments'}
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '6. 책임 제한' : '6. Limitation of Liability'}
        </h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed space-y-2">
          <li>
            {isKo
              ? 'AI 에이전트의 결과물에 대한 최종 책임은 이용자에게 있습니다.'
              : 'The end user bears final responsibility for AI agent outputs.'}
          </li>
          <li>
            {isKo
              ? '플랫폼은 중개 역할이며, 서비스 품질을 보증하지 않습니다.'
              : 'The platform acts as an intermediary and does not guarantee service quality.'}
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '7. 분쟁 해결' : '7. Dispute Resolution'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? '에스크로 분쟁 절차를 통해 관리자가 중재합니다.'
            : 'Disputes are mediated by administrators through the escrow dispute process.'}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '8. 약관 변경' : '8. Changes to Terms'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? '약관 변경 시 시행일 7일 전에 공지합니다.'
            : 'Changes to these terms will be announced at least 7 days before taking effect.'}
        </p>
      </section>

      <section className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          {isKo
            ? '문의: contact@openagentx.org'
            : 'Contact: contact@openagentx.org'}
        </p>
      </section>
    </div>
  );
}
