import { streamText } from "ai";
import { createCanvas, loadImage } from "canvas";
import { useModel, ImageItem, logger } from "#/core/index.js";

/**
 * useImage: Hook-style utility for visual analysis and element grounding.
 */
export function useImage() {
  return {
    /**
     * Image Preparation: Prepares the image (Canvas) and returns the PNG buffer and dimensions.
     */
    async prepare(image: Buffer) {
      const img = await loadImage(image);
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return {
        buffer: canvas.toBuffer("image/png"),
        originalW: img.width,
        originalH: img.height,
      };
    },

    /**
     * Coordinate Calculation: Real pixels from normalized (0-1000) values.
     */
    calculateCoordinates(
      x1: number, y1: number, x2: number, y2: number,
      targetW: number, targetH: number,
    ): ImageItem {
      const centerX = (((x1 + x2) / 2) * targetW) / 1000;
      const centerY = (((y1 + y2) / 2) * targetH) / 1000;
      const width = ((x2 - x1) * targetW) / 1000;
      const height = ((y2 - y1) * targetH) / 1000;

      return {
        label: "",
        bbox: [x1, y1, x2, y2],
        centerX,
        centerY,
        width,
        height,
      };
    },

    /**
     * assertImage: Closed visual verification.
     */
    async assert(assertion: string, imageBefore: Buffer, imageAfter: Buffer): Promise<boolean> {
      logger.log(`🔍 Assert Image: "${assertion}"`);
      const { textStream, output } = await streamText({
        model: useModel().get(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Visual Assertion Check: "${assertion}"
                  Compare the BEFORE and AFTER states. 
                  Does the AFTER state confirm the assertion?
                  Respond EXCLUSIVELY with "YES" or "NO".`,
              },
              { type: "image", image: imageBefore },
              { type: "image", image: imageAfter },
            ],
          },
        ],
      });
      await logger.chat(textStream);
      return (await output).trim().toUpperCase().includes("YES");
    },

    /**
     * findItem: Locates a unique element on an image.
     */
    async findItem(image: Buffer, goal: string): Promise<ImageItem | null> {
      logger.log(`🔍 Find Item: "${goal}"`);
      const { buffer, originalW, originalH } = await this.prepare(image);

      const { textStream, output } = await streamText({
        model: useModel().get(),
        maxOutputTokens: 20,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `STRICT INSTRUCTION: Find "${goal}". 
                Output ONLY normalized coordinates (0-1000): xmin,ymin,xmax,ymax.`,
              },
              { type: "image", image: buffer },
            ],
          },
        ],
      });

      await logger.chat(textStream);

      const match = (await output).match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (match) {
        const target = this.calculateCoordinates(
          parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4]),
          originalW, originalH,
        );
        logger.success(`Element found at (${Math.round(target.centerX)}, ${Math.round(target.centerY)})`);
        return target;
      }

      logger.error(`Not found: "${goal}"`);
      return null;
    },

    /**
     * inspect: Performs an open-ended visual analysis.
     */
    async runTask(image: Buffer, task: string): Promise<string> {
      logger.log(`🔍 Running Image Task ...`);
      const { textStream, output } = await streamText({
        model: useModel().get(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: task,
              },
              { type: "image", image },
            ],
          },
        ],
      });
      await logger.chat(textStream);
      return (await output).trim();
    }
  };
}
