import { Input, type InputRef, Space } from "antd";
import {
	createContext,
	type ReactNode,
	useContext,
	useRef,
	useState,
} from "react";

type DynamicRowListContextValue<TValue> = {
	values: TValue[];
};

const DynamicRowListContext =
	createContext<DynamicRowListContextValue<any> | null>(null);

export const useDynamicRowList = <TValue,>(): TValue[] => {
	const context = useContext(DynamicRowListContext);

	if (!context) {
		throw new Error("useDynamicRowList must be used within DynamicRowList");
	}

	return context.values as TValue[];
};

export type DynamicRowRenderProps<TValue> = {
	index: number;
	value: TValue;
	onChange: (nextValue: TValue) => void;
	remove: () => void;
};

export type DynamicRowListProps<TValue> = {
	value?: TValue[];
	onChange?: (nextValues: TValue[]) => void;
	renderRow: (props: DynamicRowRenderProps<TValue>) => ReactNode;
	addPlaceholder: string;
	maxItems?: number;
	createItemFromInput?: (input: string) => TValue;
};

function createDefaultItemFromInput(input: string): string {
	return input;
}

export const DynamicRowList = <TValue,>({
	value,
	onChange,
	renderRow,
	addPlaceholder,
	maxItems,
	createItemFromInput,
}: DynamicRowListProps<TValue>) => {
	const [draftValue, setDraftValue] = useState("");
	const inputRef = useRef<InputRef | null>(null);
	const items = (value ?? []) as TValue[];

	const handleRowChange = (index: number, nextValue: TValue) => {
		if (!onChange) return;

		const nextValues = items.map((item, idx) =>
			idx === index ? nextValue : item,
		);

		onChange(nextValues);
	};

	const handleRemove = (index: number) => {
		if (!onChange) return;

		const nextValues = items.filter((_, idx) => idx !== index);
		onChange(nextValues);
	};

	const handleCommitDraft = (focusAfterCommit: boolean) => {
		const trimmed = draftValue.trim();

		if (!onChange || !trimmed) return;
		if (maxItems && items.length >= maxItems) return;

		const factory = (createItemFromInput ||
			(createDefaultItemFromInput as unknown as (input: string) => TValue)) as (
			input: string,
		) => TValue;

		const nextItem = factory(trimmed);
		const nextValues = [...items, nextItem];

		onChange(nextValues);
		setDraftValue("");

		const hasRoomForMore =
			maxItems === undefined || nextValues.length < maxItems;

		if (focusAfterCommit && hasRoomForMore && inputRef.current) {
			// Delay focus to ensure DOM is updated
			setTimeout(() => {
				inputRef.current?.focus();
			}, 0);
		}
	};

	return (
		<DynamicRowListContext.Provider value={{ values: items }}>
			<Space direction="vertical" style={{ width: "100%" }}>
				{items.map((currentValue, index) => {
					return renderRow({
						index,
						value: currentValue,
						onChange: (nextValue) => handleRowChange(index, nextValue),
						remove: () => handleRemove(index),
					});
				})}

				{(maxItems === undefined || items.length < maxItems) && (
					<Input
						ref={inputRef}
						value={draftValue}
						placeholder={addPlaceholder}
						onChange={(event) => setDraftValue(event.target.value)}
						onPressEnter={(event) => {
							event.preventDefault();
							handleCommitDraft(true);
						}}
						onBlur={() => handleCommitDraft(false)}
					/>
				)}
			</Space>
		</DynamicRowListContext.Provider>
	);
};
