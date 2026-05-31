import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useSubmitContactMessage } from "@workspace/api-client-react";

type Errors = {
  name?: string;
  email?: string;
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Contact() {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const submit = useSubmitContactMessage({
    mutation: {
      onSuccess: () => {
        setSent(true);
        setName("");
        setOrganization("");
        setEmail("");
        setMessage("");
        setErrors({});
      },
    },
  });

  function validate(): Errors {
    const next: Errors = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!email.trim()) {
      next.email = "Please enter your email.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (!message.trim()) next.message = "Please outline your requirements.";
    return next;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    submit.mutate({
      data: {
        name: name.trim(),
        organization: organization.trim() || undefined,
        email: email.trim(),
        message: message.trim(),
      },
    });
  }

  return (
    <section id="contact" className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl font-semibold mb-6">Start a conversation.</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-12 max-w-lg">
              If you have a complex platform requirement, let's discuss how we can structure the architecture and execution. We engage selectively to ensure uncompromised quality.
            </p>
            <div className="space-y-6 text-lg">
              <div>
                <span className="block text-sm text-muted-foreground font-mono mb-1">General Inquiries</span>
                <a href="mailto:strategy@southseasolutions.com" className="hover:text-primary transition-colors">strategy@southseasolutions.com</a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-secondary/30 p-8 md:p-12 border border-border"
          >
            {sent ? (
              <div className="flex h-full flex-col items-center justify-center text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Inquiry received.</h3>
                <p className="text-muted-foreground max-w-sm">
                  Thank you for reaching out. Our team will review your brief and respond shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-8 text-sm font-medium text-primary hover:underline"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-border px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                    placeholder="Your name"
                  />
                  {errors.name ? <p className="mt-1.5 text-sm text-destructive">{errors.name}</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Organization</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full bg-background border border-border px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                    placeholder="Email address"
                  />
                  {errors.email ? <p className="mt-1.5 text-sm text-destructive">{errors.email}</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Brief</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-background border border-border px-4 py-3 focus:outline-none focus:border-primary transition-colors h-32 resize-none"
                    placeholder="Outline your requirements"
                  ></textarea>
                  {errors.message ? <p className="mt-1.5 text-sm text-destructive">{errors.message}</p> : null}
                </div>
                {submit.isError ? (
                  <p className="text-sm text-destructive">
                    Something went wrong sending your inquiry. Please try again.
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={submit.isPending}
                  className="w-full bg-primary text-primary-foreground px-6 py-4 font-medium flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-70"
                >
                  {submit.isPending ? (
                    <>
                      Sending
                      <Loader2 className="ml-2 w-4 h-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      Submit Inquiry
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
