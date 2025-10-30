import { useEffect, useRef, useState } from "react";
import "../App.css";
import { GetModels, Download, Process } from "@wailsjs/go/whisper/Whisper";
import { EventsOn } from "@wailsjs/runtime/runtime.js";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { StopCapturing, CaptureAudio } from "@wailsjs/go/audio/Audio";
import { GetConfig } from "@wailsjs/go/config/ConfigHelper";

const formatDownloadString = (model: string, progress: number) => {
  return `Downloading a model ${model}: ${progress}%`;
};

const Audio = ({ currentModel }: { currentModel: string }) => {
  const [isRecording, setRecording] = useState(false);

  const startRecording = async () => {
    setRecording(true);

    const config = await GetConfig();
    await CaptureAudio(config.MicrophoneId);
    await new Promise((r) => setTimeout(r, 5000));

    await stopRecording();
  };

  const stopRecording = async () => {
    setRecording(false);

    const audio = await StopCapturing();
    console.log(audio);
    const result = await Process(currentModel, audio);
    console.log(result);

    toast.success(result);
  };

  return (
    <Button disabled={isRecording} onClick={startRecording}>
      Record
    </Button>
  );
};

function App() {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setModel] = useState("large-v3-turbo");

  const [isDownloading, setDownloading] = useState(false);

  useEffect(() => {
    GetModels().then((models) => {
      setModels(models);
    });
  }, []);

  const startDownload = () => {
    setDownloading(true);
    const toastId = toast.loading(formatDownloadString(selectedModel, 0), {
      dismissible: false,
    });

    Download(selectedModel)
      .catch((error) => toast.error(error))
      .then(() =>
        toast.success(`Model ${selectedModel} was sucessfully installed`),
      )
      .finally(() => {
        setDownloading(false);
        toast.dismiss(toastId);
      });

    EventsOn(`whisper:download:${selectedModel}`, (percentage: number) => {
      toast.loading(formatDownloadString(selectedModel, percentage), {
        id: toastId,
        dismissible: false,
      });
    });
  };

  return (
    <div>
      <Select
        onValueChange={setModel}
        disabled={isDownloading}
        value={selectedModel}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {models.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Button disabled={isDownloading} onClick={startDownload}>
        Download
      </Button>

      <Audio currentModel={selectedModel} />
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: App,
});
