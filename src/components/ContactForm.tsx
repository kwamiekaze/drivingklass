import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Upload, X, Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(10, "Please enter a valid phone number").max(20),
  city: z.string().max(100).optional(),
  email: z.string().email("Please enter a valid email address").max(255),
  message: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof formSchema>;

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      city: "",
      email: "",
      message: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select a file smaller than 10MB.",
      });
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(selectedFile.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image (JPEG, PNG, WebP) or PDF.",
      });
      return;
    }

    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      let attachmentUrl = null;
      let attachmentName = null;

      // Upload file if present
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("contact-attachments")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("contact-attachments")
          .getPublicUrl(fileName);

        attachmentUrl = urlData.publicUrl;
        attachmentName = file.name;
      }

      // Submit form data
      const { error } = await supabase.from("contact_submissions").insert({
        full_name: data.full_name,
        phone: data.phone,
        city: data.city || null,
        email: data.email,
        message: data.message || null,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
      });

      if (error) throw error;

      // Send email notification via edge function
      try {
        await supabase.functions.invoke("send-contact-notification", {
          body: {
            ...data,
            attachment_url: attachmentUrl,
            attachment_name: attachmentName,
          },
        });
      } catch {
        // Email notification failed but form was submitted successfully
        console.log("Email notification could not be sent");
      }

      setIsSubmitted(true);
      form.reset();
      setFile(null);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <section id="contact" className="py-20 px-4">
        <div className="max-w-lg mx-auto luxury-card p-8 text-center animate-scale-in">
          <CheckCircle className="w-16 h-16 text-gold mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-gold mb-4">
            Message Sent!
          </h2>
          <p className="text-muted-foreground mb-6">
            Thank you for contacting DRIVINGKLASS. We'll get back to you shortly.
          </p>
          <Button
            onClick={() => setIsSubmitted(false)}
            className="bg-gold-gradient hover:opacity-90 text-primary-foreground"
          >
            Send Another Message
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="py-20 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-gold-shimmer mb-4">
            Contact Us
          </h2>
          <p className="text-muted-foreground">
            Have questions? We're here to help you start your driving journey.
          </p>
        </div>

        <div className="luxury-card p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Full Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        className="bg-background/50 border-gold/20 focus:border-gold"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Phone Number *</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        className="bg-background/50 border-gold/20 focus:border-gold"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">City</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Los Angeles"
                        className="bg-background/50 border-gold/20 focus:border-gold"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        className="bg-background/50 border-gold/20 focus:border-gold"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your driving goals..."
                        className="bg-background/50 border-gold/20 focus:border-gold min-h-[120px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Attachment (Optional)
                </label>
                {file ? (
                  <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-gold/20">
                    <div className="flex-1 truncate text-sm">{file.name}</div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1 hover:bg-gold/10 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gold/20 rounded-lg cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-all"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload (Images or PDF, max 10MB)
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gold-gradient hover:opacity-90 text-primary-foreground font-semibold transition-all duration-300 hover:shadow-gold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
}
