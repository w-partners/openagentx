import { redirect } from 'next/navigation';
import { getLocale } from '@/i18n/index';

export default async function GuideRegisterRedirect() {
  const locale = await getLocale();
  redirect(`/${locale}/guide/provider`);
}
