# MODEL_UPDATE_NOTES — prompt-master v1.6.0

Verification date: 2026-10-09. Scope: SKILL.md and README.md. `references/` was scanned and not edited (see the last section).

## Evidence levels

- **A — fetched.** The official page was read in full. Only `platform.claude.com` was reachable.
- **B — official page via search summary.** The sandbox network policy blocked direct fetches of OpenAI, Google, Qwen, DeepSeek, Midjourney, Runway and other vendor hosts. These items rest on search-result summaries of official-domain pages. The URL is the page the summary cited. Re-check B items before relying on exact dates or parameters.

## Text models

1. **OpenAI GPT-6 family** — **Confirmed (B), changed.** GPT-6 Astra (top), Sol (balanced; now 6.1 Sol), Luna (lightweight). Effort is a setting; supported levels differ by model. Outcome, audience, context/constraints and definition of done come from the family guide. "Over-specific instructions can hurt" comes from the Astra prompting post. GPT-5.x profile replaced; its retirement dates were not found, so it is labeled predecessor only.
   - https://developers.openai.com/api/docs/guides/latest-model
   - https://openai.com/index/practical-guide-building-gpt-6/
   - https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra
2. **o3 / o4-mini** — **Confirmed (B), changed to legacy/API note.** o4-mini left ChatGPT on 2026-02-13. o3 was scheduled to leave ChatGPT on 2026-08-26; I did not confirm that it completed. API snapshots: o3-mini and o4-mini 2026-10-23, o3 2026-12-11. Dates are kept out of SKILL.md and only listed here.
   - https://help.openai.com/en/articles/9624314-model-release-notes
   - https://developers.openai.com/api/docs/deprecations
3. **Anthropic Claude 5.5** — **Confirmed (A), changed, with two corrections.**
   - Confirmed: Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5, all with effort (low to max). Default effort: Opus 5.5 and Haiku 5.5 medium; Fable 5.1 and Sonnet 5.5 high. Haiku 5.5 is positioned for high-volume, latency-sensitive work; low effort suits subagents.
   - **Correction 1:** the lead missed Fable 5.1, the top tier. It is included.
   - **Correction 2:** the current tokenizer was introduced with Opus 4.7, not 5.5. SKILL.md says so.
   - "Over-engineers by default": Anthropic documents it for Opus 4.5 and 4.6 only. Sonnet 5.5 and Haiku 5.5 have a documented stop-and-report line for unrequested additions. The blanket rule is dropped. The line is kept as an optional add-on when the user wants minimal changes.
   - Claude 4.x status: Opus 4 / 4.1 and Sonnet 4 retired; Sonnet 4.5 deprecated (retires 2026-11-30); Opus 4.5 to 4.8 and Sonnet 4.6 active.
   - https://platform.claude.com/docs/en/about-claude/models/overview
   - https://platform.claude.com/docs/en/about-claude/model-deprecations
   - https://platform.claude.com/docs/en/build-with-claude/effort
   - https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5
   - https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5
   - https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5
4. **Google Gemini** — **Confirmed (B), changed.** 3.1 Pro (preview), 3.5 Flash, 3.1 Flash-Lite. Gemini 2.0 shut down 2026-06-01. Gemini 2.5 is restricted to prior users on the Developer API (no shutdown date) and retires 2026-10-20 on the Google Cloud platform. The dates conflict between surfaces, so SKILL.md says "restricted or retiring depending on the API surface".
   - https://ai.google.dev/gemini-api/docs/deprecations
   - https://firebase.google.com/docs/ai-logic/models
5. **Qwen 3.5+** — **Confirmed (B), changed.** Hybrid reasoning with `enable_thinking`. The hosted API defaults to thinking on; small Qwen3.5 sizes default to off. The Qwen 2.5 / Qwen3 split is replaced by an on/off check. The Qwen3.5 base model cards were not seen directly; the Qwen3.6 cards were.
   - https://huggingface.co/Qwen/Qwen3.6-35B-A3B
   - https://www.alibabacloud.com/help/en/model-studio/deep-thinking
6. **DeepSeek V4** — **Confirmed (B), changed.** Models `deepseek-v4-flash` and `deepseek-v4-pro`. Thinking is set in the request. The old `deepseek-chat` and `deepseek-reasoner` names were scheduled to be discontinued on 2026-07-24. I did not confirm the post-cutoff behavior.
   - https://api-docs.deepseek.com/updates/
   - https://api-docs.deepseek.com/news/news260424/
7. **MiniMax M3** — **Confirmed (B), changed.** M3 released 2026-06-01 (1M context, image and video input, thinking off by default). M2.7 and M2.5 kept as compatibility profiles. **Correction:** the old text gave M2.7 a 1M context window; the docs list 204,800 for M2.7 and 1M for M3. The 0 to 1 temperature rule is kept for M2.x and marked "not re-checked for M3".
   - https://platform.minimax.io/docs/guides/text-generation
   - https://www.minimax.io/blog/minimax-m3
8. **Meta and Mistral** — **Partly confirmed (B), changed.**
   - Llama 4 Scout and Maverick exist (April 2025). I found no newer Llama generation.
   - Mistral Large 4 was announced 2026-10-06 as a public preview, with weights pending.
   - CodeLlama is no longer suggested as a default. No vendor source addresses CodeLlama; this is an editorial change. Ollama now says to ask which code-capable model is installed.
   - https://mistral.ai/news/mistral-large-4/
   - https://www.llama.com/models/llama-4/

## Image, video, and other tools

9. **DALL-E 3 → GPT Image 2.5** — **Confirmed (B), changed.** DALL-E 3 was removed from the API on 2026-05-12. GPT Image 2.5 (Sunburst, Flare) shipped September 2026; ChatGPT Images 2.5 handles conversational editing. OpenAI's own pages disagree on the recommended replacement ID (gpt-image-2 versus 2.5), so no API ID is in SKILL.md. Reference-photo parameters were not found.
   - https://developers.openai.com/api/docs/models/dall-e-3
   - https://developers.openai.com/api/docs/deprecations
10. **Midjourney V8.2** — **Partly confirmed (B), changed.**
    - V8.2 became the default on 2026-07-24. The Edit Model replaces Omni Reference, Character Reference and Retexture, with up to 4 reference images.
    - Thinking Mode appears only in the alpha changelog of 2026-10-07, so SKILL.md says not to rely on it.
    - `--v 8.2` is used everywhere.
    - `--raw` is used instead of `--style raw`, based on the V8 alpha post. `--style raw` for V8.2 was not confirmed.
    - **Unverified, left as-is:** "comma-separated descriptors" for V8.2. No source covers it.
    - **Unverified:** `--sref` for V8.x (still in `references/templates.md`).
    - https://updates.midjourney.com/version-8-2/
    - https://updates.midjourney.com/edit-model-for-v8/
    - https://updates.midjourney.com/v8-alpha/
    - https://updates.midjourney.com/alpha-changelog-10-7-26/
11. **Runway Gen-4.5** — **Confirmed (B), changed.** Gen-3 Alpha was retired 2026-07-08 and Gen-3 Alpha Turbo 2026-07-30. Image-to-video uses the image as the first frame. Text-to-video and image-to-video guidance is now split.
    - https://help.runwayml.com/hc/en-us/articles/48324313115155-Image-to-Video-Prompting-Guide
    - https://help.runwayml.com/hc/en-us/articles/46974685288467-Creating-with-Gen-4-5
12. **Sora** — **Confirmed (B), marked retired (profile kept).** The app and web experience ended 2026-04-26. The API shutdown was scheduled for 2026-09-24; I did not confirm that it was switched off.
    - https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation
    - https://developers.openai.com/api/docs/deprecations
13. **Renames and retirements:**
    - **Kling** — changed. 3.x is current; 4.0 Flash is in limited rollout and the full 4.0 is scheduled for October 2026. https://kling.ai/document-api/apiReference/updateNotice
    - **Luma** — changed. Current model is Ray3.2. Luma's own page calls "Dream Machine" an older name, while other Luma pages still use it as the product name. https://lumalabs.ai/news/introducing-ray-3-2
    - **LTX** — changed. LTX-2.x; the latest model card is LTX-2.5. The official prompt guidance (one flowing chronological paragraph) is used. The LTX-2.5 length and no-JSON rules come from a community guide and are **unverified, not added**. https://github.com/Lightricks/LTX-2
    - **ElevenLabs** — changed. Eleven v4 is current; v3 is the previous generation. v3 and v4 do not support SSML break tags, so the old "SSML-like markers" advice was replaced with audio tags. https://elevenlabs.io/docs/overview/models
    - **Meshy / Tripo / Rodin** — no rename or retirement found, **no edit**. Versions (Meshy 7, Tripo 3.1, Rodin Gen-2.5) come only from vendor-run, sometimes conflicting pages, so they are **unverified** and not added. https://www.meshy.ai/
    - **Unity AI** — confirmed. The Assistant replaced Muse in 6.2 with /ask, /run, /code. A beta post names the modes Ask, Plan and Agent, so SKILL.md adds "mode names vary by version". https://docs.unity3d.com/6000.3/Documentation/Manual/getting-started-ai.html
    - **Antigravity** — changed. The "powered by Gemini 3 Pro" claim is stale. The model is user-selected (Gemini and Claude, by plan), and there is now an Antigravity 2.0 agent app. Specific model names on its models page were not copied because the versions could not be cross-checked. https://antigravity.google/docs/models/
    - **Cursor** — no rename found; no edit. https://cursor.com/changelog/2-4
    - **Windsurf** — renamed Devin Desktop on 2026-06-02 (Cognition). Changed. https://windsurf.com/changelog
    - **Devin** — no rename. Added explicit, verifiable completion criteria from the Devin docs. https://docs.devin.ai/release-notes/2026
    - **Manus** — no rename. Meta acquired it on 2025-12-29, but a 2026-08 user note mentions a "separation" from Meta, so ownership is **unverified**; no ownership claim is made in the files. https://manus.im/blog/a-note-to-our-users
    - **Comet** — exists, no change beyond removing the Atlas comparison. https://www.perplexity.ai/help-center/comet/en
    - **Atlas** — retired. OpenAI moved browser-based agent work into ChatGPT and Codex. The shutdown date in the summary was 2026-08-09; the article text itself was not seen. https://help.openai.com/en/articles/20001371-evolving-atlas-into-chatgpt-for-browser-based-agentic-work

## Other things I changed or could not confirm

- `references/templates.md` and `references/patterns.md` were **not edited**. SKILL.md still points to them. Stale hits to decide on:
  - `templates.md`: Template E says "Do NOT add CoT instructions to o1, o3, or Claude extended thinking" and "o1 / o3 / reasoning models" (lines 127, 150). This conflicts with the new Capability Check.
  - `templates.md`: Template H is titled "ReAct + Stop Conditions" and requires a Stop Conditions block (lines 16, 216, 241). SKILL.md now says "decision boundaries".
  - `templates.md`: Template I lists DALL-E, Sora and `--v 6`, and has DALL-E 3 and Sora lines (lines 17, 258, 275, 277, 278).
  - `templates.md`: Template J uses Midjourney `--cref` and `--sref` and "DALL-E 3: use the Edit endpoint" (lines 290 to 291). `--cref` is replaced by the Edit Model in V8.x.
  - `patterns.md`: `--v 6` (#19, line 43), "No stop condition for agents" (#22, line 53), "think step by step sent to o1/o3" (#27, line 65).
- The README pattern tables (#19, #22, #27) were updated to match SKILL.md, so they now differ from `references/patterns.md` until that file is updated.
- Prompt-caching order is applied as "stable instructions, then context/memory, then task-specific details". The Memory Block now sits after the stable instructions instead of at the very top.
- The `description` front-matter is unchanged (188 characters, under the 189 limit).
- Sources of a few smaller facts were search summaries only: GPT-6 `none` effort support differs between Astra, Sol and Luna in third-party guides, and OpenAI's pages were not read directly. This is not in SKILL.md.
