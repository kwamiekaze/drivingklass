import { useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Send, CheckCircle, Upload, X, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "./ThemeProvider";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useFormDraft, FileRestoreNotice } from "@/hooks/useFormDraft";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "image/jpeg", "image/jpg", "image/png",
  "image/heic", "image/heif", "image/webp",
  "application/pdf",
];

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(10, "Please enter a valid phone number").max(20),
  email: z.string().email("Please enter a valid email address").max(255),
  pickup_address: z.string().min(3, "Pickup address is required").max(500),
  dropoff_address: z.string().min(3, "Drop-off address is required").max(500),
  emergency_contact_name: z.string().min(2, "Emergency contact name is required").max(100),
  emergency_contact_phone: z.string().min(10, "Emergency contact phone is required").max(20),
  message: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof formSchema>;
interface FilePreview { file: File; preview: string; }

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FilePreview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileRestoreNeeded, setFileRestoreNeeded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const { trackClick } = useAnalytics();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "", phone: "", email: "",
      pickup_address: "", dropoff_address: "",
      emergency_contact_name: "", emergency_contact_phone: "",
      message: "",
    },
  });

  const watchedValues = useWatch({ control: form.control });

  const { clearDraft } = useFormDraft({
    formName: "contact",
    values: watchedValues as FormData,
    setValue: (values) => form.reset(values),
    routePath: "/",
    fileInfo: {
      hasFile: !!selectedFile,
      fileName: selectedFile?.file.name,
    },
    onFileRestoreNeeded: () => setFileRestoreNeeded(true),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) return;

    trackClick("permit_upload_attempt", { file_type: file.type });

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setFileError("Only JPG, PNG, HEIC, WebP images and PDF files are allowed");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File must be less than 20MB");
      return;
    }
    let preview = "";
    if (file.type.startsWith("image/")) preview = URL.createObjectURL(file);
    setSelectedFile({ file, preview });
    e.target.value = "";
  };

  const removeFile = () => {
    if (selectedFile?.preview) URL.revokeObjectURL(selectedFile.preview);
    setSelectedFile(null);
    setFileError(null);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onSubmit = async (data: FormData) => {
    if (!selectedFile) {
      setFileError("Please attach a photo of your permit");
      return;
    }
    setIsSubmitting(true);
    trackClick("contact_submit");

    try {
      const fileData = await fileToBase64(selectedFile.file);
      const fileName = selectedFile.file.name;
      const fileType = selectedFile.file.type;

      const { data: result, error } = await supabase.functions.invoke("submit-contact", {
        body: {
          full_name: data.full_name,
          phone: data.phone,
          email: data.email,
          pickup_address: data.pickup_address,
          dropoff_address: data.dropoff_address,
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_phone: data.emergency_contact_phone,
          message: data.message || undefined,
          file_data: fileData,
          file_name: fileName,
          file_type: fileType,
        },
      });

      if (error) throw new Error(error.message || "Failed to submit form");
      if (result?.error) throw new Error(result.error);

      if (selectedFile?.preview) URL.revokeObjectURL(selectedFile.preview);
      setSelectedFile(null);
      setIsSubmitted(true);
      form.reset();
      clearDraft();
      toast({ title: "Message sent!", description: "We'll get back to you shortly." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ variant: "destructive", title: "Submission failed", description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelStyle = {
    color: isLight ? "#2a2a2a" : "hsl(43 60% 55%)",
    textShadow: isLight ? "0 0 4px rgba(212, 175, 55, 0.5)" : undefined,
  };
  const inputStyle = {
    background: isLight ? "hsl(45 35% 98%)" : "hsl(25 5% 6%)",
    border: `1px solid ${isLight ? "hsl(43 50% 50% / 0.4)" : "hsl(43 50% 35% / 0.3)"}`,
    color: isLight ? "#1a1a1a" : "hsl(42 30% 90%)",
  };
  const buttonStyle = isLight
    ? {
        background: "linear-gradient(135deg, hsl(43 74% 49%) 0%, hsl(28 100% 55%) 100%)",
        color: "#1a1a1a",
        boxShadow: "0 4px 20px hsl(43 74% 49% / 0.35), inset 0 1px 0 hsl(48 85% 75% / 0.4)",
        border: "none",
      }
    : {
        background: "linear-gradient(145deg, hsl(36 75% 35%) 0%, hsl(43 80% 52%) 50%, hsl(48 75% 60%) 100%)",
        color: "hsl(30 10% 8%)",
        boxShadow: "0 4px 20px hsl(43 80% 52% / 0.3), 0 0 30px hsl(43 80% 52% / 0.15)",
        border: "none",
      };
  const uploadButtonStyle = isLight
    ? {
        background: "linear-gradient(145deg, hsl(43 60% 55% / 0.3) 0%, hsl(40 50% 60% / 0.2) 100%)",
        border: "1px solid hsl(43 60% 50% / 0.5)",
        color: "#2a2a2a",
        boxShadow: "0 2px 10px hsl(43 60% 50% / 0.2)",
      }
    : {
        background: "linear-gradient(145deg, hsl(36 75% 30% / 0.5) 0%, hsl(43 80% 45% / 0.3) 100%)",
        border: "1px solid hsl(43 60% 40% / 0.4)",
        color: "hsl(43 60% 70%)",
        boxShadow: "0 2px 10px hsl(43 80% 52% / 0.15)",
      };

  if (isSubmitted) {
    return (
      <div
        className="text-center p-8 md:p-10 rounded-2xl animate-scale-in"
        style={{
          background: isLight
            ? "linear-gradient(135deg, hsl(45 35% 96% / 0.98) 0%, hsl(42 30% 93% / 0.98) 100%)"
            : "linear-gradient(135deg, hsl(30 8% 8% / 0.9) 0%, hsl(25 5% 6% / 0.9) 100%)",
          border: `1px solid ${isLight ? "hsl(43 60% 55% / 0.4)" : "hsl(43 60% 40% / 0.3)"}`,
          boxShadow: isLight
            ? "0 4px 30px hsl(43 50% 50% / 0.2)"
            : "0 0 40px hsl(43 80% 52% / 0.1), inset 0 1px 0 hsl(43 80% 60% / 0.1)",
          backdropFilter: "blur(10px)",
        }}
      >
        <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: isLight ? "hsl(38 80% 45%)" : "hsl(43 80% 52%)" }} />
        <h3
          className="text-xl md:text-2xl font-bold tracking-wide uppercase mb-3"
          style={{
            background: isLight
              ? "linear-gradient(135deg, hsl(38 80% 38%) 0%, hsl(43 75% 48%) 100%)"
              : "linear-gradient(135deg, hsl(38 75% 50%) 0%, hsl(48 90% 70%) 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Message Sent!
        </h3>
        <p style={{ color: isLight ? "#3a3a3a" : "hsl(42 20% 60%)" }} className="mb-6">
          Thanks! We'll reach out shortly. If you sign up with the same email, your info will be ready for you.
        </p>
        <Button
          onClick={() => setIsSubmitted(false)}
          className="px-6 py-2 font-semibold tracking-wide uppercase text-sm transition-all duration-200 hover:scale-[0.98] active:scale-[0.96]"
          style={buttonStyle}
        >
          Send Another Message
        </Button>
      </div>
    );
  }

  const renderText = (name: keyof FormData, label: string, type: string = "text", placeholder = "") => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium tracking-wide" style={labelStyle}>
            {label}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              className="h-12 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-offset-0"
              style={inputStyle}
              {...field}
            />
          </FormControl>
          <FormMessage className="text-amber-500" />
        </FormItem>
      )}
    />
  );

  return (
    <div
      className="p-6 md:p-8 lg:p-10 rounded-2xl"
      style={{
        background: isLight
          ? "linear-gradient(135deg, hsl(45 35% 96% / 0.95) 0%, hsl(42 30% 93% / 0.95) 100%)"
          : "linear-gradient(135deg, hsl(30 8% 8% / 0.9) 0%, hsl(25 5% 5% / 0.9) 100%)",
        border: `1px solid ${isLight ? "hsl(43 55% 60% / 0.4)" : "hsl(43 60% 40% / 0.25)"}`,
        boxShadow: isLight
          ? "0 4px 30px hsl(43 50% 50% / 0.15), 0 0 20px hsl(43 60% 50% / 0.1)"
          : "0 0 50px hsl(0 0% 0% / 0.5), 0 0 30px hsl(43 80% 52% / 0.08)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 md:space-y-6">
          {renderText("full_name", "Full Name *", "text", "Your full name")}
          {renderText("phone", "Phone Number *", "tel", "(404) 872-1000")}
          {renderText("email", "Email *", "email", "you@email.com")}

          {/* Permit upload */}
          <div className="space-y-3">
            <label className="block text-sm font-medium tracking-wide" style={labelStyle}>
              Attach or take a photo of your permit *
            </label>
            <p className="text-xs" style={{ color: isLight ? "#555" : "hsl(42 20% 50%)" }}>
              JPG, PNG, HEIC, WebP, or PDF up to 20MB
            </p>
            {fileRestoreNeeded && !selectedFile && <FileRestoreNotice />}

            {selectedFile && (
              <div className="relative inline-block">
                {selectedFile.preview ? (
                  <img
                    src={selectedFile.preview}
                    alt="Permit preview"
                    className="w-24 h-24 object-cover rounded-lg"
                    style={{ border: `1px solid ${isLight ? "hsl(43 50% 50% / 0.4)" : "hsl(43 50% 35% / 0.3)"}` }}
                  />
                ) : (
                  <div
                    className="w-24 h-24 rounded-lg flex items-center justify-center"
                    style={{
                      background: isLight ? "hsl(45 30% 95%)" : "hsl(25 5% 10%)",
                      border: `1px solid ${isLight ? "hsl(43 50% 50% / 0.4)" : "hsl(43 50% 35% / 0.3)"}`,
                    }}
                  >
                    <span className="text-xs text-center px-2" style={{ color: isLight ? "#555" : "hsl(42 20% 60%)" }}>
                      PDF
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(0 70% 50%)", color: "white" }}
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-xs mt-1 truncate max-w-[96px]" style={{ color: isLight ? "#555" : "hsl(42 20% 60%)" }}>
                  {selectedFile.file.name}
                </p>
              </div>
            )}

            {!selectedFile && (
              <div className="flex gap-3 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                  style={uploadButtonStyle}
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">Choose File</span>
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                  style={uploadButtonStyle}
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-sm font-medium">Camera</span>
                </button>
              </div>
            )}
            {fileError && <p className="text-sm text-red-400">{fileError}</p>}
          </div>

          {renderText("pickup_address", "Pickup Address *", "text", "Street, City, State")}
          {renderText("dropoff_address", "Drop-off Address *", "text", "Street, City, State")}
          {renderText("emergency_contact_name", "Emergency Contact Name *", "text", "Parent / guardian")}
          {renderText("emergency_contact_phone", "Emergency Contact Phone *", "tel", "(404) 555-1234")}

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium tracking-wide" style={labelStyle}>
                  Message (optional)
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Anything you'd like us to know..."
                    className="min-h-[100px] rounded-xl resize-none transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                    style={inputStyle}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-amber-500" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 rounded-xl font-bold tracking-wider uppercase text-base transition-all duration-200 hover:scale-[0.99] active:scale-[0.98]"
            style={buttonStyle}
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
  );
}
