import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { HeadingNode, QuoteNode, RichTextExtension } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode, CodeExtension } from "@lexical/code";
import {
  LinkNode,
  AutoLinkNode,
  AutoLinkExtension,
  ClickableLinkExtension,
  LinkExtension,
} from "@lexical/link";
import { TailwindExtension } from "@lexical/tailwind";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import {
  AutoFocusExtension,
  defineExtension,
  HorizontalRuleExtension,
} from "@lexical/extension";
import { configExtension } from "lexical";
import { ReactExtension } from "@lexical/react/ReactExtension";
import { useEffect } from "react";

export const LoadStateFromMarkdownExtenstion = defineExtension({
  name: "md-load-ext",
  afterRegistration(editor, config, state) {
    if ("text" in config) {
      editor.update(() => {
        $convertFromMarkdownString(
          config.text! as string,
          TRANSFORMERS,
          undefined,
          true,
        );
      });
    }
    return () => {};
  },
});

const theme = {
  heading: {
    h1: "text-2xl font-bold",
    h2: "text-xl font-bold uppercase",
    h3: "text-lg uppercase",
  },
};

export const Editor = ({ text }: { text: string }) => {
  const appExtension = defineExtension({
    name: "note-editor",
    theme,
    dependencies: [
      RichTextExtension,
      CodeExtension,
      AutoFocusExtension,
      HorizontalRuleExtension,

      AutoLinkExtension,
      ClickableLinkExtension,
      LinkExtension,

      TailwindExtension,

      configExtension(LoadStateFromMarkdownExtenstion, { text }),
      configExtension(ReactExtension, { contentEditable: null }),
    ],
    nodes: [
      HeadingNode,
      QuoteNode,

      ListNode,
      ListItemNode,

      CodeNode,
      CodeHighlightNode,

      LinkNode,
      AutoLinkNode,
    ],
  });

  return (
    <LexicalExtensionComposer extension={appExtension} contentEditable={null}>
      <div className="editor-container h-full">
        <div className="editor-inner h-full">
          <ContentEditable className="editor-input focus:outline-none h-full" />
        </div>
      </div>

      <HistoryPlugin />

      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
    </LexicalExtensionComposer>
  );
};
