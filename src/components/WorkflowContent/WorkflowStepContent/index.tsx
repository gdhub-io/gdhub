import Blocks from "editorjs-blocks-react-renderer";
import { hasBlocks } from "@/helpers/editorjs";
import { editorjsRenderers } from "@/helpers/editorjs-renderers";
import styles from "./style.module.scss";

/**
 * A stage's text, as its workflow template holds it (GDHUB-97). A stage with
 * no text shows nothing: an empty stage is a stage, not an error.
 */
const WorkflowStepContent = ({
	content,
}: {
	content?: PrismaJson.EditorJsContent | null;
}) =>
	hasBlocks(content) ? (
		<div className={styles.container}>
			<Blocks
				data={{ time: 0, version: "", ...content }}
				renderers={editorjsRenderers}
			/>
		</div>
	) : null;

export default WorkflowStepContent;
