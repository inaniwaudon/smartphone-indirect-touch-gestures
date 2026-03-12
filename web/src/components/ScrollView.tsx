import styled from "@emotion/styled";

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  touch-action: none;
`;

const Content = styled.div<{ y: number }>`
  transform: translateY(${({ y }) => -y}px);
`;

interface ScrollViewProps {
	y: number;
	scrollProps: {
		onPointerDown: (e: React.PointerEvent) => void;
		onPointerMove: (e: React.PointerEvent) => void;
		onPointerUp: () => void;
		onPointerCancel: () => void;
		style: React.CSSProperties;
	};
	children: React.ReactNode;
}

const ScrollView = ({ y, scrollProps, children }: ScrollViewProps) => {
	return (
		<Wrapper {...scrollProps}>
			<Content y={y}>{children}</Content>
		</Wrapper>
	);
};

export default ScrollView;
