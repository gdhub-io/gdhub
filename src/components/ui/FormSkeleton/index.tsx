import { Col, Flex, Row, Skeleton } from "antd";
import styles from "./style.module.scss";

const LABEL_WIDTHS = [96, 72, 112, 88];

// Placeholders never reorder, so a positional name is a stable key.
const slots = (count: number, name: string) =>
	Array.from({ length: count }, (_, index) => `${name}-${index}`);

export type FormSkeletonProps = {
	/** Fields in the main column. */
	fields: number;
	/** Fields in the narrow column beside the main one. */
	aside?: number;
	/** Upload blocks in a row above the fields. */
	media?: number;
	/** The last field of the main column is a textarea. */
	textarea?: boolean;
};

function Label({ index }: { index: number }) {
	return (
		<Skeleton.Node
			active
			className={styles.label}
			style={{ width: LABEL_WIDTHS[index % LABEL_WIDTHS.length] }}
		/>
	);
}

function Field({ index, tall }: { index: number; tall?: boolean }) {
	return (
		<Flex vertical gap={8}>
			<Label index={index} />
			<Skeleton.Node
				active
				className={tall ? `${styles.bar} ${styles.textarea}` : styles.bar}
			/>
		</Flex>
	);
}

/** A settings form drawn as bars in its own shape until its data lands (frame 04.08.3). */
export function FormSkeleton({
	fields,
	aside = 0,
	media = 0,
	textarea = false,
}: FormSkeletonProps) {
	const column = (count: number, offset: number, lastTall: boolean) => (
		<Flex vertical gap={24}>
			{slots(count, `field-${offset}`).map((key, index) => (
				<Field
					key={key}
					index={index + offset}
					tall={lastTall && index === count - 1}
				/>
			))}
		</Flex>
	);

	return (
		<Flex vertical gap={32} aria-busy>
			{media > 0 && (
				<Row gutter={[24, 24]}>
					{slots(media, "media").map((key) => (
						<Col key={key} xs={24} md={12} lg={8}>
							<Flex vertical gap={8}>
								<Label index={0} />
								<Skeleton.Node
									active
									className={`${styles.bar} ${styles.media}`}
								/>
							</Flex>
						</Col>
					))}
				</Row>
			)}
			<Row gutter={[24, 24]}>
				<Col xs={24} lg={aside ? 16 : 24}>
					{column(fields, 0, textarea)}
				</Col>
				{aside > 0 && (
					<Col xs={24} lg={8}>
						{column(aside, fields, false)}
					</Col>
				)}
			</Row>
		</Flex>
	);
}
