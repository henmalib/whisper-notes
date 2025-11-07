import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MediaPlayer,
  MediaPlayerAudio,
  MediaPlayerControls,
  MediaPlayerPlay,
  MediaPlayerPlaybackSpeed,
  MediaPlayerSeek,
  MediaPlayerVolume,
} from "@/components/ui/media-player";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import {
  GetNoteMetadata,
  GetNoteAudios,
} from "@wailsjs/go/fronthelpers/FrontHelpers";
import { notes } from "@wailsjs/go/models";
import { FindNote } from "@wailsjs/go/notes/Notes";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function AudioPlayer(audio: notes.AudioFile) {
  const [isOpen, setOpen] = useState(false);

  return (
    <Collapsible open={isOpen}>
      <CollapsibleTrigger className="w-full">
        <MediaPlayer className="w-full bg-inherit">
          <MediaPlayerAudio className="sr-only">
            <source src={audio.audioPath} type="audio/wav" />
          </MediaPlayerAudio>
          <MediaPlayerControls className="flex-row items-center gap-2.5 static! opacity-100! pointer-events-auto!">
            <MediaPlayerPlay />
            <MediaPlayerSeek withTime />

            <MediaPlayerVolume />
            <MediaPlayerPlaybackSpeed />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen((p) => !p)}
              className={cn("h-8 w-16 aria-[expanded=true]:bg-accent/50")}
            >
              <ChevronDown
                className={
                  "duration-300 transition-transform" +
                  (isOpen ? " rotate-180" : "")
                }
              />
            </Button>
          </MediaPlayerControls>
        </MediaPlayer>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-2">
        <div>{audio.text}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const Route = createFileRoute("/notes/$noteId")({
  async loader(ctx) {
    const { noteId } = ctx.params;

    const note = await FindNote(noteId);
    const [metadata, audios] = await Promise.all([
      GetNoteMetadata(note),
      GetNoteAudios(note),
    ]);

    return {
      note,
      metadata,
      audios,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { noteId } = Route.useParams();
  const { metadata, audios } = Route.useLoaderData();

  return (
    <div>
      <h3>{metadata.title}</h3>

      <div className="p-4">
        {audios.map((a, index) => (
          <AudioPlayer {...a} />
        ))}
      </div>
    </div>
  );
}
