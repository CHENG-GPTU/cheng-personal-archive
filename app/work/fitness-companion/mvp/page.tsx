import type { Metadata } from "next";
import FitnessCompanionMvp from "./fitness-mvp";
import "./fitness-mvp.css";

export const metadata: Metadata = {
  title: "器械旁训练计组 MVP｜CHENG",
  description: "默认 4 组、单手完成、休息计时、撤销与刷新恢复的健身训练陪伴 MVP。",
};

export default function FitnessCompanionMvpPage() {
  return <FitnessCompanionMvp />;
}
