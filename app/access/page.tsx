import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnerUser, safeReturnPath } from "../owner-auth";
import "./access.css";

export const dynamic = "force-dynamic";

type AccessPageProps = {
  searchParams: Promise<{ error?: string; config?: string; return_to?: string }>;
};

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.return_to);
  if (await getOwnerUser()) redirect(returnTo);

  return (
    <main className="owner-access-shell">
      <div className="owner-access-grain" aria-hidden="true" />
      <div className="owner-access-wordmark" aria-hidden="true">CHENG</div>
      <aside className="owner-access-rail" aria-label="证据形成路径">
        {["知识", "判断", "产物", "面试"].map((item, index) => <span key={item}><b>{String(index + 1).padStart(2, "0")}</b>{item}</span>)}
      </aside>
      <section className="owner-access-card">
        <div className="owner-access-mark" aria-hidden="true"><span /><i /></div>
        <p className="owner-access-kicker">PRIVATE · AIPM WORKSPACE</p>
        <h1>回到你的<br />学习现场</h1>
        <p className="owner-access-copy">30 个关卡、AI 教练对话与通关证据都保留在这里。公开作品展示结果，私有工作台记录判断形成的过程。</p>
        <form action="/api/auth/login" method="post">
          <input type="hidden" name="return_to" value={returnTo} />
          <label htmlFor="access-code">专属访问码</label>
          <input id="access-code" name="access_code" type="password" autoComplete="current-password" required autoFocus placeholder="输入访问码" />
          {params.error ? <p className="owner-access-error">访问码不正确，请重新输入。</p> : null}
          {params.config ? <p className="owner-access-error">私有登录尚未完成服务端配置。</p> : null}
          <button type="submit"><span>验证并进入</span><b>ENTER ↗</b></button>
        </form>
        <Link href="/">返回公开作品集</Link>
      </section>
    </main>
  );
}
