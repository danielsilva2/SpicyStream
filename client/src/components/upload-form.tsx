import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "video/mp4"];

const uploadFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  tags: z.string().optional(),
  visibility: z.enum(["public", "private"]),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export default function UploadForm() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [files, setFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: "",
      description: "",
      tags: "",
      visibility: "public",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 500);

      try {
        const res = await apiRequest("POST", "/api/upload", {});
        clearInterval(interval);
        setUploadProgress(100);
        return await res.json();
      } catch (error) {
        clearInterval(interval);
        throw error;
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: "Your content has been uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setLocation(`/gallery/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFiles = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(file =>
      ACCEPTED_FILE_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE
    );

    if (validFiles.length !== selectedFiles.length) {
      toast({
        title: "Invalid Files",
        description: "Some files were rejected. Please only upload JPG, PNG or MP4 files under 100MB.",
        variant: "destructive",
      });
    }

    if (validFiles.length === 0) return;

    setFiles(prev => [...prev, ...validFiles]);

    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setFilePreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeFile = (index: number) => {
    setFiles(files => files.filter((_, i) => i !== index));

    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(filePreviewUrls[index]);
    setFilePreviewUrls(urls => urls.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: UploadFormValues) => {
    if (!data.title?.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive"
      });
      return;
    }
    if (files.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", data.title.trim());
    if (data.description) formData.append("description", data.description);
    if (data.tags) formData.append("tags", data.tags);
    formData.append("visibility", data.visibility);
    
    // Append each file
    files.forEach((file) => {
      formData.append("files", file);
    });

    files.forEach(file => {
      formData.append("files", file);
    });

    uploadMutation.mutate(formData);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Content</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* File Upload Area */}
            <div className="mb-6">
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">Files</FormLabel>
              <div
                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="space-y-1 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none">
                      <span>Upload files</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        accept="image/jpeg,image/png,video/mp4"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, or MP4 up to 100MB
                  </p>
                </div>
              </div>
            </div>

            {/* Uploaded Files Preview */}
            {files.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filePreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={url}
                          alt={`Upload preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="mt-1 text-xs text-gray-500 truncate">
                        {files[index].name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Title and Description */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a title for your gallery" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a description..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Add tags separated by commas (e.g., nature, landscape, travel)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public">Public (visible to everyone)</SelectItem>
                      <SelectItem value="private">Private (only visible to you)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Processing Files...</h3>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  Processing {files.length} files ({Math.round(uploadProgress)}% complete)
                </p>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/")}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || uploadMutation.isPending}
              >
                {isUploading || uploadMutation.isPending ? "Uploading..." : "Upload Content"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}