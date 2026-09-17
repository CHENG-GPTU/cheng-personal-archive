"use client";

import Link from "next/link";
import { ArchiveMusicControl } from '../archive-music';

export default function ResumeActions() {
  return <nav className="resume-actions" aria-label="简历操作">
    <Link href="/">← 返回档案入口</Link>
    <ArchiveMusicControl compact />
    <div><button type="button" onClick={() => window.print()}>打印 / 保存 PDF</button></div>
  </nav>;
}
