import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

const NAV_ITEMS = [
  { to: "/", label: "今日" },
  { to: "/history", label: "历史" },
  { to: "/stones", label: "石头" },
  { to: "/reviews", label: "复盘" },
  { to: "/settings", label: "设置" },
];

function getPageMeta(pathname: string) {
  if (pathname === "/history") {
    return { title: "历史回看", description: "搜索、筛选、重读过去的记录。" };
  }
  if (pathname === "/stones") {
    return { title: "石头库", description: "沉淀长期重复出现的心理模式。" };
  }
  if (pathname === "/reviews") {
    return { title: "周期复盘", description: "按周和月回看高频模式与场景。" };
  }
  if (pathname === "/settings") {
    return { title: "设置", description: "管理导出、备份、账号和偏好。" };
  }
  return {
    title: "今日道痕",
    description: "围绕今天最起波澜的一件事，写下七层记录。",
  };
}

export function AppLayout() {
  const location = useLocation();
  const meta = getPageMeta(location.pathname);
  const currentAccount = useAuthStore((state) => state.currentAccount);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>道痕日记本</h1>
          <p>StoneDiary · 离线结构化认知日记</p>
        </div>
        <nav className="nav-list">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="main-shell">
        <header className="topbar">
          <div>
            <h2>{meta.title}</h2>
            <p>{meta.description}</p>
          </div>
          <div className="toolbar">
            <div className="chip">账号：{currentAccount?.username ?? "未登录"}</div>
            <button type="button" className="btn ghost" onClick={() => void logout()}>
              退出登录
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
