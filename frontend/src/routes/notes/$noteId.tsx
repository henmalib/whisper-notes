import { createFileRoute } from "@tanstack/react-router";
import {
  GetNoteMetadata,
  GetNoteAudios,
} from "@wailsjs/go/fronthelpers/FrontHelpers";
import { FindNote } from "@wailsjs/go/notes/Notes";

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

      <div>
        {audios.map((a) => (
          <div>
            <div className="flex flex-row gap-4">
              <audio controls src={a.audioPath} />
            </div>
            <div>{a.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
