import { getDictionary, Locale } from "@/lib/get-dictionary";
import HomePage from "@/components/home-page";
import { Metadata } from "next";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale = (lang === 'en' ? 'en' : 'zh') as Locale;
  const dict = await getDictionary(locale);
  
  return {
    title: dict.title,
    description: dict.description,
  };
}

export default async function Page({ searchParams }: Props) {
  const { lang } = await searchParams;
  const locale = (lang === 'en' ? 'en' : 'zh') as Locale;
  const dict = await getDictionary(locale);
  return <HomePage dict={dict} />;
}

