import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import UploadForm from "@/components/upload-form";

export default function UploadPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-bg">
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <UploadForm />
        </div>
      </main>
      <MobileNavigation activeTab="upload" />
    </div>
  );
}
