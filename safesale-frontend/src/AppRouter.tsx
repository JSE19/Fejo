import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Landing from "./pages/Landing";
import HowItWorks from "./pages/HowItWorks";
import ForSellers from "./pages/ForSellers";
import PublicListing from "./pages/PublicListing";
import Checkout from "./pages/Checkout";
import BuyerOrder from "./pages/BuyerOrder";
import Onboarding from "./pages/Onboarding";
import Admin from "./pages/Admin";
import { MediatorGate } from "./components/safesale/MediatorGate";

import DashboardHome from "./pages/app/DashboardHome";
import ListingsPage from "./pages/app/ListingsPage";
import OrdersPage from "./pages/app/OrdersPage";
import OrderDetailPage from "./pages/app/OrderDetailPage";
import EarningsPage from "./pages/app/EarningsPage";
import DisputePage from "./pages/app/DisputePage";
import SettingsPage from "./pages/app/SettingsPage";

import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Marketing */}
        <Route path="/" element={<Landing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/for-sellers" element={<ForSellers />} />

        {/* Buyer flow */}
        <Route path="/buy/:id" element={<PublicListing />} />
        <Route path="/checkout/:id" element={<Checkout />} />
        {/* Buyer order page — token is the buyer's secret credential. */}
        <Route path="/order/:token" element={<BuyerOrder />} />

        {/* Seller onboarding */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Seller dashboard (MVP scope per PRD §51-89) */}
        <Route path="/app" element={<DashboardHome />} />
        <Route path="/app/listings" element={<ListingsPage />} />
        <Route path="/app/orders" element={<OrdersPage />} />
        <Route path="/app/orders/:token" element={<OrderDetailPage />} />
        <Route path="/app/earnings" element={<EarningsPage />} />
        <Route path="/app/settings" element={<SettingsPage />} />
        <Route path="/app/dispute" element={<DisputePage />} />
        <Route path="/app/dispute/:id" element={<DisputePage />} />

        {/* Admin / mediator — gated to VITE_MEDIATOR_NPUB only. */}
        <Route
          path="/admin"
          element={
            <MediatorGate>
              <Admin />
            </MediatorGate>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
