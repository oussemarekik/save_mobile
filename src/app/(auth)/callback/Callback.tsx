import React, { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { XCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Callback() {
  const [, params] = useRoute("/callback/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [message, setMessage] = useState(
    "Magic link sign-in is not supported by the current backend configuration. Please sign in with email and password."
  );

  useEffect(() => {
    toast({
      title: "Unsupported route",
      description:
        "This callback path is deprecated. Please use standard email and password login.",
      variant: "destructive",
    });
  }, [toast]);

  useEffect(() => {
    if (!params?.token) {
      setMessage(
        "No callback token was provided. Please sign in with email and password."
      );
    }
  }, [params?.token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h2 className="font-display font-bold text-2xl mb-2 text-destructive">
          Verification Unsupported
        </h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        <button
          onClick={() => setLocation("/signin")}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
        >
          Back to Sign In
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="font-display font-bold text-2xl mb-2">Verifying...</h2>
            <p className="text-muted-foreground">Please wait while we verify your magic link</p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            </motion.div>
            <h2 className="font-display font-bold text-2xl mb-2 text-green-600">Success!</h2>
            <p className="text-muted-foreground mb-4">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="font-display font-bold text-2xl mb-2 text-destructive">Verification Failed</h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <button
              onClick={() => setLocation("/signin")}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
            >
              Back to Sign In
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

