import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

type StudyResourceToShare = {
  id: string;
  title: string;
  file_url: string;
  file?: Blob;
};

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("Could not prepare the PDF."));
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not prepare the PDF."));
    reader.readAsDataURL(blob);
  });
}

export async function shareStudyResource(resource: StudyResourceToShare): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    await Share.share({
      title: resource.title,
      text: "Study resource from NesAI",
      url: resource.file_url,
    });
    return;
  }

  let file = resource.file;
  if (!file) {
    const response = await fetch(resource.file_url);
    if (!response.ok) throw new Error("The study file could not be downloaded.");
    file = await response.blob();
  }
  if (!file.size || file.size > 25 * 1024 * 1024) {
    throw new Error("This file is empty or too large to share (25 MB maximum).");
  }
  if (new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-") {
    throw new Error("This resource is not a downloadable PDF.");
  }

  const safeId = resource.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const path = `nesai-study-${safeId}.pdf`;
  await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
  const { uri } = await Filesystem.writeFile({
    path,
    data: await toBase64(file),
    directory: Directory.Cache,
  });
  await Share.share({
    title: resource.title,
    text: "Study resource from NesAI",
    files: [uri],
    dialogTitle: "Share study resource",
  });
}
