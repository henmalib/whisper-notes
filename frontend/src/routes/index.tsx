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
import { StereoAudioRecorder, RecordRTCPromisesHandler } from "recordrtc";

const formatDownloadString = (model: string, progress: number) => {
  return `Downloading a model ${model}: ${progress}%`;
};

const Audio = ({ currentModel }: { currentModel: string }) => {
  const [isRecording, setRecording] = useState(false);
  const recorder = useRef<RecordRTCPromisesHandler>(null as any);

  const startRecording = async () => {
    setRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: "B7FD5EF81492377086A8DBB156709B32B78A8904",
      },
    });

    recorder.current = new RecordRTCPromisesHandler(stream, {
      type: "audio",
      mimeType: "audio/wav",
      recorderType: StereoAudioRecorder,
      numberOfAudioChannels: 1,
    });
    await recorder.current.startRecording();

    await new Promise((r) => setTimeout(r, 3000));
    await stopRecording();
  };

  const stopRecording = async () => {
    const someString = await recorder.current.stopRecording();
    console.log("stopRecording returned", someString);
    const blob = await recorder.current.getBlob();

    await recorder.current.destroy();
    setRecording(false);

    // @ts-ignore
    const ac = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000,
    });
    const arrBuf = await blob.arrayBuffer();
    const audioBuf = await ac.decodeAudioData(arrBuf);

    const samples16k = new Float32Array(audioBuf.getChannelData(0));

    // We already know, that this is a NUMBER array
    const result = await Process(currentModel, [...samples16k] as any);

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
