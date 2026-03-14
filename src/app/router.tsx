import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { HistoryPage } from "@/pages/history/HistoryPage";
import { ReviewsPage } from "@/pages/reviews/ReviewsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { StonesPage } from "@/pages/stones/StonesPage";
import { TodayPage } from "@/pages/today/TodayPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "stones", element: <StonesPage /> },
      { path: "reviews", element: <ReviewsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
