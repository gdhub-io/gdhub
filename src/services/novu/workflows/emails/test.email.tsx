import { Body, Container, Head, Html, render } from "@react-email/components";
import * as React from "react";

interface TestEmailProps {
	name: string;
}

export const TestEmailTemplate = ({ name }: TestEmailProps) => {
	return (
		<Html>
			<Head />
			<Body>
				<Container>
					Hello {name} welcome to your first React E-mail template!
				</Container>
			</Body>
		</Html>
	);
};

export default TestEmailTemplate;

export function renderEmail(name: string) {
	return render(<TestEmailTemplate name={name} />);
}
