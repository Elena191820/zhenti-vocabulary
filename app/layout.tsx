import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "真题词库｜英语二真题背单词",
  description: "从真题语境出发，用间隔重复记住考研英语二词汇。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
