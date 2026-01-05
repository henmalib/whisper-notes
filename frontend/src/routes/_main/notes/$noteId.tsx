import { Editor } from "@/components/editor";
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
  GetNoteText,
  SaveNote,
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

export const Route = createFileRoute("/_main/notes/$noteId")({
  remountDeps({ params }) {
    return params;
  },
  async loader({ params: { noteId } }) {
    const note = await FindNote(noteId);
    const [metadata, audios, text] = await Promise.all([
      GetNoteMetadata(note),
      GetNoteAudios(note),
      GetNoteText(note),
    ]);

    return {
      note,
      metadata,
      audios,
      text,
    };
  },
  component: RouteComponent,
  shouldReload: true,
});

function RouteComponent() {
  const { metadata, audios, text, note } = Route.useLoaderData();
  const [title, setTitle] = useState(metadata.title);

  const save = async () => {
    SaveNote(note.id, "test", {
      ...metadata,
      title,
    });
  };

  return (
    <div className="w-full h-full">
      <div className="w-full flex">
        <span
          className="focus-visible:ring-0 rounded-none text-xl! min-h-12! font-bold resize-none w-full p-4 outline-none border-b-2 border-accent border-solid"
          contentEditable
          onInput={(e) => setTitle(e.currentTarget.innerHTML)}
        >
          <div dangerouslySetInnerHTML={{ __html: title }}></div>
        </span>
      </div>

      <div className="p-4 w-full">
        {audios.map((a, index) => (
          <AudioPlayer key={index} {...a} />
        ))}
      </div>

      <Button onClick={save}>SAVE</Button>

      <Editor text={text} />
    </div>
  );
}
