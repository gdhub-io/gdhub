"use client";

import classNames from "classnames";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
	type WelcomeCharacter as Character,
	getWelcomeCharacter,
} from "@/helpers/welcome-character";
import styles from "./style.module.scss";

const ART: Record<Character, { src: string; width: number; height: number }> = {
	female: {
		src: "/images/welcome/character-female.png",
		width: 144,
		height: 156,
	},
	male: { src: "/images/welcome/character-male.png", width: 132, height: 143 },
};

/**
 * The greeting character in the hub welcome bar.
 *
 * Which one it is is a browser-side draw, so nothing renders until the effect
 * has run — server markup with one character and a client draw of the other
 * would be a hydration mismatch, and the block is decorative enough to appear a
 * frame late.
 */
export function WelcomeCharacter({ userId }: { userId?: string | null }) {
	const [character, setCharacter] = useState<Character | null>(null);

	useEffect(() => {
		if (!userId) return;
		setCharacter(getWelcomeCharacter(userId));
	}, [userId]);

	if (!character) return null;

	const art = ART[character];

	return (
		<div className={styles.character} aria-hidden="true">
			<Image
				className={classNames(styles.art, styles[character])}
				src={art.src}
				alt=""
				width={art.width}
				height={art.height}
			/>
		</div>
	);
}
