import type { Metadata } from 'next';
import HomePage from '@/components/home-page';
import { getDictionary, type Locale } from '@/lib/get-dictionary';

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale = (lang === 'en' ? 'en' : 'zh') as Locale;
  const dict = await getDictionary(locale);

  return {
    title: 'afd-dl',
    description: dict.description,
  };
}

export default async function Page({ searchParams }: Props) {
  const { lang } = await searchParams;
  const locale = (lang === 'en' ? 'en' : 'zh') as Locale;
  const dict = await getDictionary(locale);
  return <HomePage dict={dict} />;
}
