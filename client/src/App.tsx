import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import FeedPage from "@/pages/feed-page";
import SavedPage from "@/pages/saved-page";
import ProfilePage from "@/pages/profile-page";
import UploadPage from "@/pages/upload-page";
import GalleryPage from "@/pages/gallery-page";
import { AuthProvider } from "./hooks/use-auth"; // Assuming AuthProvider is defined elsewhere

function Router() {
  return (
    <Switch>
      {/* Rotas públicas - qualquer um pode acessar sem login */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={HomePage} />
      <Route path="/gallery/:id" component={GalleryPage} />

      {/* Rotas protegidas - exigem login */}
      <ProtectedRoute path="/feed" component={FeedPage} />
      <ProtectedRoute path="/saved" component={SavedPage} />
      <ProtectedRoute path="/upload" component={UploadPage} />

      {/* Profile page is now public */}
      <Route path="/profile/:username?" component={ProfilePage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Router />
      </div>
    </AuthProvider>
  );
}

export default App;