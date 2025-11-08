import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { GetNoteMetadata } from "@wailsjs/go/fronthelpers/FrontHelpers";
import { ListNotes } from "@wailsjs/go/notes/Notes";
import { List, RowComponentProps, useDynamicRowHeight } from "react-window";
import { Route as NoteRoute } from "./notes/$noteId";
import { GetConfig } from "@wailsjs/go/config/ConfigHelper";

export const Route = createFileRoute("/_main")({
  component: RouteComponent,
  async loader() {
    const [config, notes] = await Promise.all([GetConfig(), ListNotes()]);

    return { config, notes };
  },
});

function RouteComponent() {
  return (
    <div className="h-full flex flex-row gap-2 w-full">
      <NotesList />

      <div className="w-full">
        <Outlet />
      </div>
    </div>
  );
}

const Note = ({
  index,
  notes,
  style,
}: RowComponentProps<{
  notes: Awaited<ReturnType<typeof ListNotes>>;
}>) => {
  const note = notes[index];

  const { data: metadata } = useQuery({
    queryKey: ["notes", notes[index].id, "metadata"],
    queryFn: () => GetNoteMetadata(note),
    staleTime: 1000 * 60 * 60,
  });

  return (
    <Link
      preload="intent"
      className="p-2 hover:bg-muted"
      to={NoteRoute.to}
      params={{
        noteId: note.id,
      }}
      style={style}
    >
      <h2 className="font-bold">{metadata?.title || "Loading"}</h2>
      <h4 className="">{new Date(note.ModifyDate).toLocaleString()}</h4>
    </Link>
  );
};

const NotesList = () => {
  const { notes } = Route.useLoaderData();

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 66,
  });

  // console.log(rowHeight.getRowHeight(0));

  return (
    <div className="w-60 h-full overflow-hidden border border-border relative min-h-0">
      <div className="absolute inset-0">
        <List
          style={{
            width: "100%",
            height: "100%",
          }}
          className="bg-muted/60 divide-border divide-y-2 h-full w-full overscroll-none"
          rowComponent={Note}
          rowCount={notes.length}
          rowHeight={rowHeight}
          overscanCount={5}
          defaultHeight={1100}
          rowProps={{ notes }}
        />
      </div>
    </div>
  );
};
