const aaa = () => {
  return (
    <div key={item.id} className="flex flex-1 gap-[16px]">
      <div className="flex h-full w-full flex-col gap-[12px] rounded-[8px] bg-white px-[14px] py-[16px]">
        <div className="flex items-center gap-[4px]">
          <CircleCheckIcon
            fill="#C3C3C3"
            color="#fff"
            className="mt-[2px] h-[24px] w-[24px] flex-none"
          />
          <p className="w-[260px] truncate text-[14px] font-semibold tracking-tight">
            {item.title}
          </p>
        </div>

        <p className="px-[4px] text-[12px] text-[#646464]">{item.html_url}</p>
      </div>
    </div>
  );
};
