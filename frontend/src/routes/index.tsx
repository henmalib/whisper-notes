import { useEffect, useState } from "react";
import "../App.css";
import {
  GetModels,
  Download,
  Process,
  GetModelLanguages,
  IsModelInstalled,
} from "@wailsjs/go/whisper/Whisper";
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
import { GetConfig, UpdateConfig } from "@wailsjs/go/config/ConfigHelper";
import { useQuery } from "@tanstack/react-query";

const formatDownloadString = (model: string, progress: number) => {
  return `Downloading a model ${model}: ${progress}%`;
};

const Audio = ({
  currentModel,
  selectedLanguage,
  disabled,
}: {
  currentModel: string;
  selectedLanguage: string;
  disabled: boolean;
}) => {
  const [isRecording, setRecording] = useState(false);

  const startRecording = async () => {
    setRecording(true);

    const config = await GetConfig();
    await CaptureAudio(config.MicrophoneId);
  };

  const stopRecording = async () => {
    setRecording(false);
    const audio = await StopCapturing();

    const toastId = toast.loading("Processing audio: 0%", {
      dismissible: false,
      duration: Infinity,
    });

    EventsOn(`whisper:audio:${toastId}:process`, (progress) => {
      toast.loading(`Processing autio: ${progress}%`, {
        id: toastId,
        dismissible: false,
      });
    });

    const result = await Process(
      currentModel,
      audio,
      selectedLanguage,
      toastId.toString(),
    );

    toast.dismiss(toastId);
    toast.success(result);
  };

  if (!isRecording) {
    return (
      <Button disabled={disabled} onClick={startRecording}>
        Record
      </Button>
    );
  }

  return <Button onClick={stopRecording}>Stop</Button>;
};

const getLanguageForSelect = async (model: string) => {
  const displayNames = new Intl.DisplayNames(["en"], {
    type: "language",
  });

  try {
    const langs = await GetModelLanguages(model);

    const formattedLangs = langs.map((l) => ({
      label: displayNames.of(l)!,
      value: l,
    }));

    if (langs.length >= 2) {
      return [
        { label: "Auto (⚠️ May be incorrect)", value: "auto" },
        ...formattedLangs,
      ];
    }

    return formattedLangs;
  } catch (e) {
    return [{ label: displayNames.of("en")!, value: "en" }];
  }
};

function App() {
  const [models, setModels] = useState<string[]>([]);
  const [isDownloading, setDownloading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [selectedModel, setSelectedModel] = useState(
    Route.useLoaderData().model,
  );

  const { data: isSelectedModelInstalled } = useQuery({
    initialData: false,
    enabled: true,
    queryKey: ["model", "installed", selectedModel],
    queryFn: () => IsModelInstalled(selectedModel),
  });

  console.log("isSelectedModelInstalled", isSelectedModelInstalled);

  const { data: modelLanguges } = useQuery({
    queryKey: ["model", "language", selectedModel],
    queryFn: () => getLanguageForSelect(selectedModel),
  });

  const setModel = (model: string) => {
    setSelectedModel(model);
    UpdateConfig("CurrentModel", model);
  };

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

      <Select onValueChange={setLanguage} value={language}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {(modelLanguges || []).map(({ label, value }) => (
              <SelectItem key={label} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Button disabled={isDownloading} onClick={startDownload}>
        Download
      </Button>

      <Audio
        disabled={!isSelectedModelInstalled}
        currentModel={selectedModel}
        selectedLanguage={language}
      />
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: App,
  async loader() {
    const config = await GetConfig();

    return { model: config.CurrentModel };
  },
});
