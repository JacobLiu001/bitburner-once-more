// Some DOM helpers (partial credit to @ShamesBond and @alainbryden)
import { NS } from "@ns";
import { log } from "./utils";

const SLEEP_FIND = 10;
const SLEEP_CLICK = 5;

let doc: Document = eval("document");

/* Used to search for an element in the document. This can fail if the dom isn't
   fully re-rendered yet. */
function find_xpath(xpath: string) {
  return doc.evaluate(
    xpath,
    doc,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue;
}

/** Try to find an element, with retries.
 * @param {NS} ns
 *
 * @param {string} xpath The xpath 1.0 expression to use to find the element.
 *
 * @param {null|number} maxRetries (defaults to 5) The number of times to retry.
 *
 * @param {string?} customErrorMessage (optional) A custom error message to
 * replace the default on failure.
 */
export async function find_xpath_with_retry(
  ns: NS,
  xpath: string,
  maxRetries: null | number,
  customErrorMessage: string | null = null,
) {
  maxRetries = maxRetries || 5; // If not specified or is 0, default to 5
  await ns.sleep(SLEEP_FIND);
  const logSafeXpath = xpath.substring(2, 20) + "...";
  let retries = 0;
  while (retries === 0 || (maxRetries !== null && retries < maxRetries)) {
    const elem = find_xpath(xpath);
    if (elem !== null) return elem;
    retries++;
    // Wait for the DOM to load; 200ms is one tick.
    await ns.sleep(Math.min(1 << retries, 200));
  }
  throw new Error(
    customErrorMessage ?? `Failed to find element with xpath: ${logSafeXpath}`,
  );
}

export async function click(ns: NS, button: Node) {
  if (button === null || button === undefined) {
    throw new Error(
      "click was called on a null reference. This means the prior button detection failed, but was assumed to have succeeded.",
    );
  }
  await ns.sleep(SLEEP_CLICK);
  // Find the onclick method on the button
  // This is voodoo to me. Apparently it's function on the first property of this button?
  let fnOnClick = button[Object.keys(button)[1]].onClick;
  if (!fnOnClick)
    throw new Error(
      `Odd, we found a button, but couldn't find its onclick method!`,
    );
  // Click the button. The "secret" to this working is just to pass any object
  // containing isTrusted:true
  await fnOnClick({ isTrusted: true });
  await ns.sleep(SLEEP_CLICK);
}

export async function setText(
  ns: NS,
  input: Node,
  text: string,
  verbose: boolean = false,
) {
  if (input === null || input === undefined) {
    throw new Error(
      "setText was called on a null reference. This means the prior input detection failed, but was assumed to have succeeded.",
    );
  }
  await ns.sleep(SLEEP_CLICK);
  if (verbose) {
    log(ns, `Setting text: ${text} on input.`, true);
  }
  await input[Object.keys(input)[1]].onChange({
    isTrusted: true,
    currentTarget: { value: text },
  });
  await ns.sleep(SLEEP_CLICK);
}
