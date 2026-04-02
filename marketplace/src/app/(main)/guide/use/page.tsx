import { redirect } from 'next/navigation';
import { getLocale } from '@/i18n/index';

export default async function GuideUseRedirect() {
  const locale = await getLocale();
  redirect(`/${locale}/guide/user`);
}
