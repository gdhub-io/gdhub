import { Select, type SelectProps } from "antd";
import {
	DirectionBadge,
	directionSlug,
	WORK_DIRECTIONS,
} from "@/components/DirectionBadge";

/** Option shape: `value` is whatever the form stores (id or slug), `label` is the direction NAME. */
type DirectionOption = { value: string; label: string };

export type DirectionSelectProps = Omit<SelectProps<string>, "options"> & {
	/** Direction options (`label` must be the direction name — the icon is resolved from it). */
	options?: DirectionOption[];
	/** Alternative to `options`: a list of direction names (value becomes the slug). */
	directions?: string[];
	/** Prepend an "all directions" entry (value `"all"`). */
	includeAll?: boolean;
	/** Label for the "all directions" entry. */
	allLabel?: string;
	/** Icon chip size in px. Default 24. */
	iconSize?: number;
};

/**
 * antd Select for work directions. Drop-in for a plain `Select` whose options are
 * directions: each option shows the direction's icon chip next to its name, and
 * the chip is also rendered before the selected value.
 *
 * Pass `options` (value + name) exactly like a normal Select, or `directions`
 * (names → slug values). With neither, every known direction is listed.
 */
export function DirectionSelect({
	options,
	directions,
	includeAll = false,
	allLabel = "All directions",
	iconSize = 24,
	...rest
}: DirectionSelectProps) {
	const base: { value: string; name: string }[] = options
		? options.map((o) => ({ value: o.value, name: String(o.label) }))
		: directions
			? directions.map((name) => ({ value: directionSlug(name), name }))
			: WORK_DIRECTIONS.map((d) => ({ value: d.slug, name: d.label }));

	const built = [
		...(includeAll
			? [{ value: "all", title: allLabel, label: <span>{allLabel}</span> }]
			: []),
		...base.map((d) => ({
			value: d.value,
			title: d.name,
			label: (
				<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
					<DirectionBadge name={d.name} onlyIcon size={iconSize} />
					<span>{d.name}</span>
				</span>
			),
		})),
	];

	return (
		<Select<string>
			options={built}
			optionLabelProp="label"
			optionFilterProp="title"
			{...rest}
		/>
	);
}

export default DirectionSelect;
