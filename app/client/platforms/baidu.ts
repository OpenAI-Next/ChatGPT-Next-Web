import { Baidu, REQUEST_TIMEOUT_MS } from "@/app/constant";
import { ChatOptions, getHeaders, LLMApi, LLMModel, LLMUsage } from "../api";
import { useAccessStore, useAppConfig, useChatStore } from "@/app/store";
import { getClientConfig } from "@/app/config/client";
import { DEFAULT_API_HOST } from "@/app/constant";

export class ErnieApi implements LLMApi {
  extractMessage(res: any) {
    console.log("[Response] ernie response: ", res);

    return (
      res?.candidates?.at(0)?.content?.parts.at(0)?.text ||
      res?.error?.message ||
      ""
    );
  }
  async chat(options: ChatOptions): Promise<void> {
    const messages = options.messages.map((v) => {
      return {
        role: v.role,
        content: v.content,
      };
    });

    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig,
      ...{
        model: options.config.model,
      },
    };
    const accessStore = useAccessStore.getState();

    const requestPayload = {
      messages,
      stream: true,
    };

    let baseUrl = "";

    if (accessStore.useCustomConfig) {
      baseUrl = accessStore.baiduUrl;
    }

    const isApp = !!getClientConfig()?.isApp;

    let shouldStream = !!options.config.stream;
    const controller = new AbortController();
    options.onController?.(controller);
    try {
      if (!baseUrl) {
        baseUrl = isApp
          ? DEFAULT_API_HOST +
            "/api/proxy/baidu/" +
            Baidu.ChatPath(modelConfig.model)
          : this.path(Baidu.ChatPath(modelConfig.model));
      }

      if (isApp) {
        baseUrl += `?key=${accessStore.baiduApiKey}`;
      }
      const chatPayload = {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        // TODO
        headers: getHeaders(),
      };

      // make a fetch request
      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      if (shouldStream) {
        let responseText = "";
        let remainText = "";
        let finished = false;

        let existingTexts: string[] = [];
        const finish = () => {
          finished = true;
          options.onFinish(existingTexts.join(""));
        };

        // animate response to make it looks smooth
        function animateResponseText() {
          if (finished || controller.signal.aborted) {
            responseText += remainText;
            finish();
            return;
          }

          if (remainText.length > 0) {
            const fetchCount = Math.max(1, Math.round(remainText.length / 60));
            const fetchText = remainText.slice(0, fetchCount);
            responseText += fetchText;
            remainText = remainText.slice(fetchCount);
            options.onUpdate?.(responseText, fetchText);
          }

          requestAnimationFrame(animateResponseText);
        }

        // start animaion
        animateResponseText();

        fetch(
          baseUrl.replace("generateContent", "streamGenerateContent"),
          chatPayload,
        )
          .then((response) => {
            const reader = response?.body?.getReader();
            const decoder = new TextDecoder();
            let partialData = "";

            return reader?.read().then(function processText({
              done,
              value,
            }): Promise<any> {
              if (done) {
                if (response.status !== 200) {
                  try {
                    let data = JSON.parse(ensureProperEnding(partialData));
                    if (data && data[0].error) {
                      options.onError?.(new Error(data[0].error.message));
                    } else {
                      options.onError?.(new Error("Request failed"));
                    }
                  } catch (_) {
                    options.onError?.(new Error("Request failed"));
                  }
                }

                console.log("Stream complete");
                // options.onFinish(responseText + remainText);
                finished = true;
                return Promise.resolve();
              }

              partialData += decoder.decode(value, { stream: true });

              try {
                let data = JSON.parse(ensureProperEnding(partialData));

                const textArray = data.reduce(
                  (acc: string[], item: { candidates: any[] }) => {
                    const texts = item.candidates.map((candidate) =>
                      candidate.content.parts
                        .map((part: { text: any }) => part.text)
                        .join(""),
                    );
                    return acc.concat(texts);
                  },
                  [],
                );

                if (textArray.length > existingTexts.length) {
                  const deltaArray = textArray.slice(existingTexts.length);
                  existingTexts = textArray;
                  remainText += deltaArray.join("");
                }
              } catch (error) {
                // console.log("[Response Animation] error: ", error,partialData);
                // skip error message when parsing json
              }

              return reader.read().then(processText);
            });
          })
          .catch((error) => {
            console.error("Error:", error);
          });
      } else {
        const res = await fetch(baseUrl, chatPayload);
        clearTimeout(requestTimeoutId);
        const resJson = await res.json();
        if (resJson?.promptFeedback?.blockReason) {
          // being blocked
          options.onError?.(
            new Error(
              "Message is being blocked for reason: " +
                resJson.promptFeedback.blockReason,
            ),
          );
        }
        const message = this.extractMessage(resJson);
        options.onFinish(message);
      }
    } catch (e) {
      console.log("[Request] failed to make a chat request", e);
      options.onError?.(e as Error);
    }
  }
  usage(): Promise<LLMUsage> {
    throw new Error("Method not implemented.");
  }
  async models(): Promise<LLMModel[]> {
    return [];
  }
  path(path: string): string {
    return "/api/baidu/" + path;
  }
}

function ensureProperEnding(str: string) {
  if (str.startsWith("[") && !str.endsWith("]")) {
    return str + "]";
  }
  return str;
}
