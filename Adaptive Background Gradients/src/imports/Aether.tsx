function Background() {
  return <div className="absolute h-[989px] right-0 top-0 w-[1710px]" data-name="Background" style={{ backgroundImage: "linear-gradient(rgb(135, 179, 225) 0%, rgb(135, 179, 225) 10.01%, rgb(135, 179, 225) 20.02%, rgb(162, 179, 222) 28.14%, rgb(170, 180, 219) 31.3%, rgb(180, 181, 216) 35.54%, rgb(192, 185, 208) 43.08%, rgb(198, 185, 207) 46.94%, rgb(203, 185, 205) 50.81%, rgb(205, 180, 203) 56.12%, rgb(207, 174, 199) 61.34%, rgb(205, 169, 198) 64.98%, rgb(202, 165, 197) 68.56%, rgb(199, 161, 196) 72.59%, rgb(195, 158, 196) 76.56%, rgb(180, 156, 205) 83.12%, rgb(164, 156, 210) 88.49%, rgb(144, 157, 213) 94.47%, rgb(123, 158, 212) 100%)" }} />;
}

function Text() {
  return (
    <div className="absolute content-stretch flex h-[15.5px] items-start left-0 top-0 w-[39.883px]" data-name="Text">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[13px] text-[rgba(255,255,255,0.55)] tracking-[-0.18px] whitespace-nowrap">Aether</p>
    </div>
  );
}

function List() {
  return <div className="absolute left-[71.88px] size-0 top-[12.5px]" data-name="List" />;
}

function Navigation() {
  return (
    <div className="h-[15.5px] relative shrink-0 w-[672px]" data-name="Navigation">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Text />
        <List />
      </div>
    </div>
  );
}

function Title() {
  return (
    <div className="h-[41.594px] relative shrink-0 w-full" data-name="Title">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[41.6px] left-0 not-italic text-[32px] text-[rgba(255,255,255,0.93)] top-[0.5px] tracking-[-0.18px] whitespace-nowrap">Default Settings</p>
    </div>
  );
}

function Date() {
  return (
    <div className="content-stretch flex h-[17px] items-start relative shrink-0 w-full" data-name="Date">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[normal] min-h-px min-w-px not-italic relative text-[14px] text-[rgba(255,255,255,0.55)] tracking-[-0.18px]">March 2026</p>
    </div>
  );
}

function TitleDate() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Title + Date">
      <Title />
      <Date />
    </div>
  );
}

function Paragraph() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[29.24px] not-italic relative shrink-0 text-[17px] text-[rgba(255,255,255,0.93)] tracking-[-0.18px] w-[668px]">{`There was a moment, years ago now, when I realized I hadn't looked at a sunset without framing it first. My hand went to my pocket before my eyes had finished adjusting. The light was doing something remarkable over the rooftops — that particular amber that only happens in late October when the atmosphere is heavy with dust — and my first instinct was to capture it, to flatten it into a rectangle of pixels. I caught myself, but only barely, and what stayed with me wasn't the sunset. It was the reflex.`}</p>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[29.24px] not-italic relative shrink-0 text-[17px] text-[rgba(255,255,255,0.93)] tracking-[-0.18px] w-[672px]">{`We've spent two decades training ourselves to see the world at arm's length. Not through glass in the old sense — windows, spectacles, the polished surfaces that once separated inside from outside — but through glass that thinks, glass that decides what we look at and for how long. The screen has become our primary organ of perception. We wake to it. We eat beside it. We fall asleep bathed in its blue-shifted light, our circadian rhythms rewritten by engineers in Cupertino who probably sleep just fine. The color temperature of our evenings is no longer set by the sun.`}</p>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[29.24px] not-italic relative shrink-0 text-[17px] text-[rgba(255,255,255,0.93)] tracking-[-0.18px] w-[672px]">{`What strikes me most isn't the quantity of time we spend looking at screens — that argument has been made and made again until it means nothing. It's the qualitative shift in how we process space. I notice it in small ways. A room feels different before I photograph it and after. The photograph doesn't capture the room; it replaces it. Once I've taken the picture, the image becomes the memory, and the room as it actually was — the way the light fell unevenly across the floorboards, the slight smell of old wood and coffee — compresses into something thinner, something that fits in a timeline. We are building an enormous archive of surfaces and losing the volumes beneath them.`}</p>
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[29.24px] not-italic relative shrink-0 text-[17px] text-[rgba(255,255,255,0.93)] tracking-[-0.18px] w-[670px]">{`I think about the color white more than I should. Not white as painters understood it — lead white, zinc white, titanium white, each with its own warmth and weight — but white as screens render it. #FFFFFF. Pure, impossible, the absence of all subtlety. No wall has ever been this white. No paper, no snow, no bone. It's a color that exists only in light, projected directly into the eye, and we've made it the default background of our lives. Every document, every message, every thought we type appears on this supernatural white. And then we wonder why the physical world looks dim when we glance up from our phones. We've recalibrated our expectations of brightness. The sun now competes with the display.`}</p>
    </div>
  );
}

function Paragraph4() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[29.24px] not-italic relative shrink-0 text-[17px] text-[rgba(255,255,255,0.93)] tracking-[-0.18px] w-[671px]">{`Perhaps what we're really mourning — if mourning is the right word, and I'm not sure it is — is the loss of ambient experience. The world used to wash over us. Light changed slowly. A cloud would pass and the room would shift from warm to cool and back again, and you'd barely notice unless you were paying a particular kind of attention. Now our environments are fixed. LED panels at 5000K from morning to night. The same brightness in the kitchen at noon as at midnight. We've eliminated the information that light used to carry — time of day, season, weather, the slow planetary tilt that used to be written in the angle of shadows on a wall. We replaced it with constancy, with the factory settings, and called it an improvement. Maybe it was. But something was lost in the trade, and I think we feel its absence in ways we haven't yet learned to name.`}</p>
    </div>
  );
}

function Article() {
  return (
    <div className="relative shrink-0 w-full" data-name="Article">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[32px] items-start relative w-full">
        <TitleDate />
        <Paragraph />
        <Paragraph1 />
        <Paragraph2 />
        <Paragraph3 />
        <Paragraph4 />
      </div>
    </div>
  );
}

function Paragraph5() {
  return (
    <div className="content-stretch flex h-[15.5px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[normal] min-h-px min-w-px not-italic relative text-[13px] text-[rgba(255,255,255,0.55)] tracking-[-0.18px]">Dushanbe, 2026</p>
    </div>
  );
}

function Footer() {
  return (
    <div className="relative shrink-0 w-[672px]" data-name="Footer">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <Paragraph5 />
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col gap-[120px] items-start pl-[24px] py-[40px] relative shrink-0 w-[720px]" data-name="Container">
      <Navigation />
      <Article />
      <Footer />
    </div>
  );
}

function Body() {
  return (
    <div className="absolute bg-[#7b9ed4] content-stretch flex flex-col h-[1974px] items-center left-0 overflow-clip top-0 w-[1710px]" data-name="Body">
      <Background />
      <Container />
    </div>
  );
}

export default function Aether() {
  return (
    <div className="bg-[#87b3e1] relative size-full" data-name="Aether">
      <Body />
    </div>
  );
}