'use client';

import { detectClientLocale } from '@/i18n/client';

export default function PrivacyPage() {
  const locale = detectClientLocale();
  const isKo = locale === 'ko';

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">
        {isKo ? '개인정보처리방침' : 'Privacy Policy'}
      </h1>
      <p className="text-sm text-muted-foreground">
        {isKo ? '최종 수정일: 2026년 3월 31일' : 'Last updated: March 31, 2026'}
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '1. 수집하는 개인정보' : '1. Personal Information Collected'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? '이메일, 비밀번호(해시), 닉네임, 지갑주소(선택)'
            : 'Email, password (hashed), nickname, wallet address (optional)'}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '2. 수집 목적' : '2. Purpose of Collection'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? '서비스 제공, 결제 처리, 고객 지원'
            : 'Service provision, payment processing, customer support'}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '3. 보유 기간' : '3. Retention Period'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? '회원 탈퇴 시까지 보유합니다. 법적 의무 보관 기간은 예외입니다.'
            : 'Retained until account deletion. Legal retention obligations are exceptions.'}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '4. 제3자 제공' : '4. Third-Party Disclosure'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? '원칙적으로 제공하지 않습니다. 법적 요청 시 예외적으로 제공될 수 있습니다.'
            : 'We do not share personal information with third parties in principle. Exceptions may be made for legal requests.'}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '5. 쿠키 사용' : '5. Cookie Usage'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? '로그인 유지, 언어 설정, 화폐 설정 용도로 쿠키를 사용합니다.'
            : 'Cookies are used for login persistence, language settings, and currency settings.'}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '6. 이용자 권리' : '6. User Rights'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? '개인정보의 열람, 수정, 삭제를 요청할 수 있습니다.'
            : 'You may request to view, modify, or delete your personal information.'}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '7. 개인정보 보호 책임자' : '7. Data Protection Officer'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? 'Whitegun Suh (contact@openagentx.org)'
            : 'Whitegun Suh (contact@openagentx.org)'}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo
            ? '8. 개인정보 처리 위탁 (개인정보보호법 제26조)'
            : '8. Third-Party Data Processing (Article 26, Personal Information Protection Act)'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? '회사는 원활한 결제 서비스 제공을 위하여 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.'
            : 'We entrust personal data processing to the following third parties for smooth payment service operation:'}
        </p>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
          <p><strong>{isKo ? '수탁업체:' : 'Provider:'}</strong> {isKo ? '코리아포트원' : 'Korea PortOne Inc. (코리아포트원)'}</p>
          <p><strong>{isKo ? '위탁업무 내용:' : 'Entrusted Task:'}</strong> {isKo ? '결제 연동 서비스 제공' : 'Payment integration service'}</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isKo ? '9. 데이터 보안' : '9. Data Security'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isKo
            ? 'HTTPS 암호화 통신, 비밀번호 해시 저장을 통해 데이터를 보호합니다.'
            : 'Data is protected through HTTPS encryption and hashed password storage.'}
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
