import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu, Upload, User, LogOut, Settings, LogIn } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Tratamento seguro para o caso de o AuthProvider não estar disponível
  let user = null;
  let logoutMutation = { mutate: () => {}, isPending: false };

  try {
    const auth = useAuth();
    user = auth.user;
    logoutMutation = auth.logoutMutation;
  } catch (error) {
    // Se o useAuth falhar, manteremos user como null
    console.log("Auth context not available");
  }

  // Navegação básica (disponível para todos)
  const baseNavigation = [
    { name: "Home", href: "/", current: location === "/" },
  ];

  // Navegação para usuários autenticados
  const authNavigation = user ? [
    ...baseNavigation,
    { name: "Feed", href: "/feed", current: location === "/feed" },
    { name: "Saved", href: "/saved", current: location === "/saved" },
    { name: "Profile", href: `/profile/${user?.username}`, current: location.startsWith("/profile") },
  ] : baseNavigation;

  // Escolha qual navegação exibir com base no status de autenticação
  const navigation = user ? authNavigation : baseNavigation;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a href="/" onClick={(e) => {
              e.preventDefault();
              window.location.href = '/';
            }} className="flex-shrink-0 flex items-center cursor-pointer">
              <span className="text-primary text-2xl font-bold">RedShare</span>
            </a>
            {/* Desktop Navigation */}
            <nav className="hidden md:ml-6 md:flex md:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    item.current
                      ? "text-primary"
                      : "text-neutral-dark hover:text-primary"
                  } px-3 py-2 text-sm font-medium`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Desktop Right Nav */}
          <div className="hidden md:flex items-center">
            {user ? (
              // Usuário autenticado - mostrar upload e menu de perfil
              <>
                <Link href="/upload">
                  <Button className="inline-flex items-center">
                    <Upload className="h-4 w-4 mr-2" /> Upload
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger className="ml-4">
                    <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center text-primary">
                      <span className="font-medium">{user.username.substring(0, 2).toUpperCase()}</span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Link href={`/profile/${user.username}`}>
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/settings">
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onClick={() => logoutMutation.mutate()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              // Usuário não autenticado - mostrar botão de login
              <Link href="/auth">
                <Button className="inline-flex items-center">
                  <LogIn className="h-4 w-4 mr-2" /> Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="flex flex-col h-full py-6">
                  <Link href="/" className="text-primary text-2xl font-bold mb-6 hover:opacity-80">RedShare</Link>
                  <nav className="flex-1 space-y-1">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`${
                          item.current
                            ? "bg-primary-light text-primary"
                            : "text-neutral-dark hover:bg-gray-50"
                        } block px-3 py-3 text-base font-medium rounded-md`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}

                    {user && (
                      <Link
                        href="/settings"
                        className="text-neutral-dark hover:bg-gray-50 block px-3 py-3 text-base font-medium rounded-md"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Settings
                      </Link>
                    )}
                  </nav>

                  <div className="pt-4 mt-auto">
                    {user ? (
                      // Botão de logout para usuários autenticados
                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        onClick={() => {
                          logoutMutation.mutate();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    ) : (
                      // Botão de login para usuários não autenticados
                      <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                        <Button
                          variant="outline"
                          className="w-full justify-center"
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          Login / Register
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}