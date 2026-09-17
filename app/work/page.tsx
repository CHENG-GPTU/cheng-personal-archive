import type { Metadata } from "next";
import ChengHome from "../cheng-home";
export const metadata: Metadata = { title: "作品目录｜陈俊呈", description: "AIPM 学习系统、健身与减脂助手、项目复盘 Skill 和个人档案的制作过程与验证边界。" };
export default function PublicWorkIndex() {
  return <ChengHome workOnly />;
}
