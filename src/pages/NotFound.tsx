import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Compass, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const REDIRECT_SECONDS = 8;

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  // Auto-redirect de cortesia para o dashboard, com cancelamento ao interagir
  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(() => {
      if (cancelled) return;
      setCountdown((s) => {
        if (s <= 1) {
          clearInterval(timer);
          navigate("/dashboard", { replace: true });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center space-y-5 bg-card/80 backdrop-blur">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Compass className="h-7 w-7" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
          <p className="text-sm text-muted-foreground">
            O endereço <code className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 text-xs">{location.pathname}</code> não existe ou foi descontinuado.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button asChild className="gap-1.5">
            <Link to="/dashboard">
              <Home className="h-4 w-4" /> Ir para o dashboard
            </Link>
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground pt-1">
          Redirecionando automaticamente em {countdown}s…
        </p>
      </Card>
    </div>
  );
};

export default NotFound;
