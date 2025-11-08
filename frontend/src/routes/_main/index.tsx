import { useEffect, useState } from "react";
import {
  GetModels,
  Download,
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
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { StopCapturing, CaptureAudio } from "@wailsjs/go/audio/Audio";
import { GetConfig, UpdateConfig } from "@wailsjs/go/config/ConfigHelper";
import { ProcessAndSaveNote } from "@wailsjs/go/fronthelpers/FrontHelpers";
import { useQuery } from "@tanstack/react-query";
import { Route as NoteRoute } from "./notes/$noteId";

const formatDownloadString = (model: string, progress: number) => {
  return `Downloading a model ${model}: ${progress}%`;
};

const Audio = ({
  selectedLanguage,
  disabled,
}: {
  currentModel: string;
  selectedLanguage: string;
  disabled: boolean;
}) => {
  const [isRecording, setRecording] = useState(false);
  const navigate = useNavigate();

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

    try {
      const noteId = await ProcessAndSaveNote(
        audio,
        selectedLanguage,
        toastId.toString(),
      );

      // toast.success(noteId);
      navigate({
        to: NoteRoute.to,
        params: {
          noteId,
        },
      });
    } finally {
      toast.dismiss(toastId);
    }
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

    const formattedLangs = langs
      .map((l) => ({
        label: displayNames.of(l)!,
        value: l,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

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
  const {
    config: { CurrentModel: model, PreferedLanguage },
    models,
  } = Route.useLoaderData();

  const [isDownloading, setDownloading] = useState(false);
  const [language, setCurrentLanguage] = useState(PreferedLanguage);
  const [selectedModel, setSelectedModel] = useState(model);

  const setLanguage = (lang: string) => {
    UpdateConfig("PreferedLanguage", lang);
    setCurrentLanguage(lang);
  };

  const { data: isSelectedModelInstalled } = useQuery({
    initialData: false,
    enabled: true,
    queryKey: ["model", "installed", selectedModel],
    staleTime: 0,
    queryFn: () => IsModelInstalled(selectedModel),
  });

  const { data: modelLanguges } = useQuery({
    queryKey: ["model", "language", selectedModel],
    queryFn: () => getLanguageForSelect(selectedModel),
    enabled: isSelectedModelInstalled,
    meta: { persist: true },
    staleTime: Infinity,
  });

  const setModel = (model: string) => {
    setSelectedModel(model);
    UpdateConfig("CurrentModel", model);
  };

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

      {/* TODO: Display Loader */}
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
        disabled={!isSelectedModelInstalled || !language}
        currentModel={selectedModel}
        selectedLanguage={language}
      />
    </div>
  );
}

export const Route = createFileRoute("/_main/")({
  component: App,
  async loader() {
    const [config, models] = await Promise.all([GetConfig(), GetModels()]);

    return { config, models };
  },
});
