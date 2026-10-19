import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: LayoutProps<"/[locale]/auth">) {
  return <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">{children}</div>;
}
